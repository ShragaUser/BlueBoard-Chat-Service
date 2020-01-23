const axios = require("axios");
const { chatUrl, chatGroupUrl, chatMessageUrl, chatLoginUrl, loginUser, loginPass } = require("./config/config");
const { trycatch } = require("./utils/util");

const wrappedAxiosPost = trycatch(axios.post);
const wrappedAxiosGet = trycatch(axios.get);

const login = async () => {
    if (this.userId && this.authToken)
        return { userId: this.userId, authToken: this.authToken };
    const { result } = await wrappedAxiosPost(`${chatUrl}/${chatLoginUrl}`, { username: loginUser, password: loginPass });
    if (result) {
        if (result.data && result.data.status === "success") {
            const { data } = result;
            const { userId, authToken } = data.data;
            this.userId = userId;
            this.authToken = authToken;
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

const getAllowedGroupTitleFromText = title => {
    if (this.cache && this.cache[title])
        return this.cache[title];

    const isAlphaNumeric = 'a-zA-Z0-9';
    const isHebrewChars = 'א-ת';
    const isAllowedSpecialChars = '_.-';
    const regexString = `^${isAlphaNumeric}${isHebrewChars}${isAllowedSpecialChars}`;
    const regexExppresion = new RegExp(`[${regexString}]`, 'g');
    const allowedTitle = title.replace(regexExppresion, str => str.split('').map(() => '.').join(''));

    this.cache = this.cache || {};
    this.cache[title] = allowedTitle;

    return this.cache[title];
}

const createGroup = async (groupName, members) => {
    const authHeaders = await getAuthHeaders();
    const name = getAllowedGroupTitleFromText(groupName);
    const { result } = await wrappedAxiosPost(`${chatUrl}/${chatGroupUrl}.create`, { name, members }, { headers: { ...authHeaders } });
    if (result) {
        const { _id: groupId } = result.data.group;
        return groupId;
    }
};

const getGroupMembers = async roomId => {
    const authHeaders = await getAuthHeaders();
    const { result } = await wrappedAxiosGet(`${chatUrl}/${chatGroupUrl}.info?roomId=${roomId}`, { headers: { ...authHeaders } });
    if (result && result.data) {
        const { usernames } = result.data.group;
        return usernames;
    }
    return false;
};

const addMemberToGroupFactory = roomId => async member => {
    const authHeaders = await getAuthHeaders();
    return await wrappedAxiosPost(`${chatUrl}/${chatGroupUrl}.invite`, { roomId, username: member }, { headers: { ...authHeaders } });
};

const addMembersToGroup = async (roomId, members) => {
    const addMemberToRoom = addMemberToGroupFactory(roomId);
    const results = await Promise.all(members.map(addMemberToRoom));
    return results.map(({ result }) => result);
};

const removeMemberFromGroupFactory = roomId => async member => {
    const authHeaders = await getAuthHeaders();
    return member !== loginUser ? await wrappedAxiosPost(`${chatUrl}/${chatGroupUrl}.kick`, { roomId, username: member }, { headers: { ...authHeaders } }) : true;
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
        !arr2.map(item => item.toLowerCase()).includes(arr1Item.toLowerCase()) ? symmetricDifference.push(arr1Item) : null;
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
    const { result } = await wrappedAxiosPost(`${chatUrl}/${chatGroupUrl}.archive`, { roomId }, { headers: { ...authHeaders } });
    return result;
}

const renameGroup = async (roomId, groupName) => {
    const authHeaders = await getAuthHeaders();
    const name = getAllowedGroupTitleFromText(groupName);
    const { result } = await wrappedAxiosPost(`${chatUrl}/${chatGroupUrl}.rename`, { roomId, name }, { headers: { ...authHeaders } });
    return result;
}

const sendMessageToGroup = async (roomId, text) => {
    const authHeaders = await getAuthHeaders();
    const { result } = await wrappedAxiosPost(`${chatUrl}/${chatMessageUrl}.postMessage`, { channel: `#${roomId}`, text }, { headers: { ...authHeaders } });
    return result;
}


module.exports = { createGroup, setRoomMembers, closeGroup, renameGroup, sendMessageToGroup };
