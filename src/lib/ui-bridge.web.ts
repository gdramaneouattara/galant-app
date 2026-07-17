/**
 * Affiche une alerte standard sur navigateur
 */
export const showAlert = (title: string, message: string) => {
  window.alert(`${title}\n\n${message}`);
};
