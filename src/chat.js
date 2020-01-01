const axios = require("axios");
const { chatUrl, chatGroupUrl, chatLoginUrl, loginUser, loginPass } = require("./config/config");
const { trycatch } = require("./utils/util");

const wrappedAxiosPost = trycatch(axios.post);

const login = async () => {
    const { result } = wrappedAxiosPost(`${chatUrl}/${chatLoginUrl}`, { username: loginUser, password: loginPass });
    if (result) {
        if (result.status === "success") {
            const { data } = result;
            const { userId, authToken } = data;
            return { userId, authToken };
        } else {
            console.error(result);
        }
    }
};

const getAuthHeaders = async () => {
    const { userId, authToken } = await login();
    const headers = {
        'X-Auth-Token': authToken,
        'X-User-Id': userId
    };
    return headers;
};

const createGroup = async (name, members) => {
    const authHeaders = await getAuthHeaders();
    const { result } = wrappedAxiosPost(`${chatUrl}/${chatGroupUrl}.create`, { name, members }, { headers: { ...authHeaders } });
    if (result) {
        const { _id: groupId } = result.group;
        return groupId;
    }
};

const addMemberToGroupFactory = roomId => async member => {
    const authHeaders = await getAuthHeaders();
    return wrappedAxiosPost(`${chatUrl}/${chatGroupUrl}.invite`, { roomId, username: member }, { headers: { ...authHeaders } });
};

const addMembersToGroup = async (roomId, members) => {
    const addMemberToRoom = addMemberToGroupFactory(roomId);
    const results = await Promise.all(members.map(addMemberToRoom));
    return results.map(({ result }) => result);
};

const closeGroup = async roomId => {
    const authHeaders = await getAuthHeaders();
    const { result } = wrappedAxiosPost(`${chatUrl}/${chatGroupUrl}.close`, { roomId }, { headers: { ...authHeaders } });
    return result;
}

module.exports = { createGroup, addMembersToGroup, closeGroup };
