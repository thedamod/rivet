const fs = require("node:fs/promises");
function encryptedStorage(file, safeStorage) {
  async function available() {
    if (!(await safeStorage.isAsyncEncryptionAvailable())) return false;
    return (
      process.platform !== "linux" ||
      safeStorage.getSelectedStorageBackend() !== "basic_text"
    );
  }
  return {
    async load() {
      try {
        const bytes = await fs.readFile(file);
        if (!(await available())) return null;
        const { result } = await safeStorage.decryptStringAsync(bytes);
        return JSON.parse(result);
      } catch (error) {
        if (error.code === "ENOENT") return null;
        // A locked or changed keyring must never fall back to plaintext.
        return null;
      }
    },
    async save(value) {
      if (!value) {
        await fs.rm(file, { force: true });
        return;
      }
      if (!(await available()))
        throw new Error(
          "Unlock your system keyring to save your GitHub session.",
        );
      const encrypted = await safeStorage.encryptStringAsync(
        JSON.stringify(value),
      );
      await fs.writeFile(file + ".tmp", encrypted, { mode: 0o600 });
      await fs.rename(file + ".tmp", file);
    },
  };
}
module.exports = { encryptedStorage };
