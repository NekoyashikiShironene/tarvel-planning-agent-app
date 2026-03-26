export const getSessionId = () => {
    let sessionId;
    sessionId = localStorage.getItem("session");
    if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem("session", sessionId);
    }
    return sessionId;
};

export const clearSession = () => {
    localStorage.removeItem("session");
};