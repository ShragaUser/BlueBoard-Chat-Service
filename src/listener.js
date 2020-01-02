const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");
const { MONGODB_NAME } = require("./config/config");
const { createGroup, setRoomMembers, closeGroup } = require("./chat");

dotenv.config();

MongoClient.connect(process.env.MONGODB_URL).then(async client => {
    const db = client.db(MONGODB_NAME);
    const boards = db.collection("boards");
    const boardsCursor = boards.watch();

    const handleInsertEvent = async (fullDocument) => {
        const { title, users, _id } = fullDocument;
        const members = users.map(user => user.id);
        const roomId = await createGroup(title, members);
        boards.updateOne({ _id }, { $set: { chatRoomId: roomId } }, (err, result) => {
            err ? console.error(err) : null;
        });
    };

    const handleDeleteEvent = async (roomId) => {
        await closeGroup(roomId);
    };

    const handleUpdateEvent = async (fullDocument, updateDescription) => {
        const { updatedFields } = updateDescription;
        const { chatRoomId } = fullDocument;

        if (updatedFields && updatedFields["isDeleted"])
            return await handleDeleteEvent(chatRoomId);

        if (!chatRoomId) {
            return await handleInsertEvent(fullDocument);
        }

        if (updatedFields && updatedFields["users"]) {
            const members = updatedFields["users"].map(({ id }) => id);
            return await setRoomMembers(chatRoomId, members);
        }
    };

    const handleBoardChange = async document => {
        if (document) {
            const { fullDocument, operationType, updateDescription } = document;
            if (operationType === 'insert') {
                return await handleInsertEvent(fullDocument);
            }
            if (operationType === 'update') {
                return await handleUpdateEvent(fullDocument, updateDescription);
            }
        }
    }

    boardsCursor.on('change', handleBoardChange);

});