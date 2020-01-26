const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");
const { MONGODB_NAME, MONGODB_URL, GREETING_MSG } = require("./config/config");
const { createGroup, setRoomMembers, closeGroup, renameGroup, sendMessageToGroup } = require("./chat");

dotenv.config();

MongoClient.connect(MONGODB_URL).then(async client => {
    const db = client.db(MONGODB_NAME);
    const boards = db.collection("boards");
    const boardsCursor = boards.watch();

    const handleInsertEvent = async (fullDocument) => {
        const { users, _id, title } = fullDocument;
        const members = users.map(user => user.id);
        const roomId = await createGroup(`${title}-${_id}`, members);
        sendMessageToGroup(roomId, `${GREETING_MSG} - ${title}`);
        boards.updateOne({ _id }, { $set: { chatRoomId: roomId } }, (err, result) => {
            err ? console.error(err) : null;
        });
    };

    const handleDeleteEvent = async (roomId) => {
        await closeGroup(roomId);
    };

    const getFullDocumentFromBoardsCollection = async (id) => {
        return await boards.findOne({ _id: id });
    }

    const handleUpdateEvent = async (documentId, updateDescription) => {
        const fullDocument = await getFullDocumentFromBoardsCollection(documentId);
        const { updatedFields } = updateDescription;
        const { chatRoomId } = fullDocument;

        if (updatedFields && updatedFields["isDeleted"])
            return await handleDeleteEvent(chatRoomId);

        if (!chatRoomId) {
            return await handleInsertEvent(fullDocument);
        }


        if (updatedFields && updatedFields["title"]) {
            const title = updatedFields["title"];
            await renameGroup(chatRoomId, `${title}-${documentId}`);
        }

        if (updatedFields && updatedFields["users"]) {
            const members = updatedFields["users"].map(({ id }) => id);
            return await setRoomMembers(chatRoomId, members);
        }
    };

    const handleBoardChange = async document => {
        if (document) {
            const { fullDocument, documentKey, operationType, updateDescription } = document;
            if (operationType === 'insert') {
                return await handleInsertEvent(fullDocument);
            }
            if (operationType === 'update') {
                return await handleUpdateEvent(documentKey._id, updateDescription);
            }
        }
    }

    boardsCursor.on('change', handleBoardChange);

});
