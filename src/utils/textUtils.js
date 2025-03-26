const MAX_DESC_LENGTH = 1000;

function formatDescription(rawDescription) {
    if (!rawDescription) return null;

    let cleaned = rawDescription.replace(/<\s*br\s*\/?>/gi, '\n');
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    cleaned = cleaned.replace(/\r\n/g, '\n');
    cleaned = cleaned.replace(/(\n){3,}/g, '\n\n');
    cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');
    cleaned = cleaned.trim();

    if (cleaned.length > MAX_DESC_LENGTH) {
        const lastNewlineBeforeCutoff = cleaned.substring(0, MAX_DESC_LENGTH).lastIndexOf('\n');

        if (lastNewlineBeforeCutoff > MAX_DESC_LENGTH * 0.5) {
            cleaned = cleaned.substring(0, lastNewlineBeforeCutoff) + '\n...';
        } else {
            cleaned = cleaned.substring(0, MAX_DESC_LENGTH - 3) + '...';
        }
    }

    return cleaned || null;
}

module.exports = {
    formatDescription,
    MAX_DESC_LENGTH
};