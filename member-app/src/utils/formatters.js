export const paiseToRupees = (paise) => {
  if (paise === null || paise === undefined) return 0;
  return Number(paise) / 100;
};

export const formatINR = (paise) => {
  const rupees = paiseToRupees(paise);
  return '₹' + Number(rupees).toLocaleString('en-IN');
};

export const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};
