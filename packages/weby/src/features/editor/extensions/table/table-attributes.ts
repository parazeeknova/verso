export function tableCellAttributes() {
  return {
    backgroundColor: {
      default: null,
      parseHTML: (element: HTMLElement) =>
        element.style.backgroundColor || element.dataset.backgroundColor || null,
      renderHTML: (attributes: Record<string, unknown>) => {
        if (!attributes.backgroundColor) {
          return {};
        }
        return {
          "data-background-color": attributes.backgroundColor,
          style: `background-color: ${attributes.backgroundColor}`,
        };
      },
    },
    backgroundColorName: {
      default: null,
      parseHTML: (element: HTMLElement) => element.dataset.backgroundColorName || null,
      renderHTML: (attributes: Record<string, unknown>) => {
        if (!attributes.backgroundColorName) {
          return {};
        }
        return {
          "data-background-color-name": (attributes.backgroundColorName as string).toLowerCase(),
        };
      },
    },
  };
}
