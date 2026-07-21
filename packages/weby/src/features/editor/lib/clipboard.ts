export const handleCopy = async (text: string, setCopyState: (v: boolean) => void) => {
  try {
    await navigator.clipboard.writeText(text);
    setCopyState(true);
    setTimeout(() => setCopyState(false), 2000);
  } catch (error) {
    console.error("failed to copy:", error);
  }
};
