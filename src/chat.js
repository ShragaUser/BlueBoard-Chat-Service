const axios = require("axios");
const { chatUrl, chatGroupUrl, chatLoginUrl, loginUser, loginPass } = require("./config/config");
const { trycatch } = require("./utils/util");

const wrappedAxiosPost = trycatch(axios.post);
const wrappedAxiosGet = trycatch(axios.get);

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

const getGroupMembers = async roomId => {
    const authHeaders = await getAuthHeaders();
    const { result } = await wrappedAxiosGet(`${chatUrl}/${chatGroupUrl}.info?roomId=${roomId}`, { headers: { ...authHeaders } });
    if (result && result.group) {
        const { usernames } = result.group;
        return usernames;
    }
    return false;
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

const removeMemberFromGroupFactory = roomId => async member => {
    const authHeaders = await getAuthHeaders();
    return wrappedAxiosPost(`${chatUrl}/${chatGroupUrl}.kick`, { roomId, username: member }, { headers: { ...authHeaders } });
};

const removeMembersFromGroup = async (roomId, members) => {
    const removeMemberFromRoom = removeMemberFromGroupFactory(roomId);
    const results = await Promise.all(members.map(removeMemberFromRoom));
    return results.map(({ result }) => result);
};

/**
 * return every item in arr1 that doesnt exist in arr2
 * @param {*} arr1 
 * @param {*} arr2 
 */
const getNonItercectingItems = (arr1, arr2) => {
    const symmetricDifference = [];
    arr1.forEach(arr1Item => {
        !arr2.includes(arr1Item) ? symmetricDifference.push(arr1Item) : null;
    });
    return symmetricDifference;
};

const setRoomMembers = async (roomId, members) => {
    const currentGroupMembers = await getGroupMembers(roomId);
    if (currentGroupMembers && currentGroupMembers.length > 0) {
        const membersToRemove = getNonItercectingItems(currentGroupMembers, members);
        const membersToAdd = getNonItercectingItems(members, currentGroupMembers);
        await removeMembersFromGroup(roomId, membersToRemove);
        await addMembersToGroup(roomId, membersToAdd);
    }
};

const closeGroup = async roomId => {
    const authHeaders = await getAuthHeaders();
    const { result } = wrappedAxiosPost(`${chatUrl}/${chatGroupUrl}.close`, { roomId }, { headers: { ...authHeaders } });
    return result;
}

module.exports = { createGroup, setRoomMembers, closeGroup };
