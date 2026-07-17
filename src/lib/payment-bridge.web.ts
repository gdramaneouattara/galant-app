export const openPaymentUrl = async (url: string) => {
  // Sur le web, on ouvre simplement un nouvel onglet ou on redirige
  window.location.href = url;
  return true;
};
