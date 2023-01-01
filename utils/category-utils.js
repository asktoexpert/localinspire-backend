exports.mapCategoryQueryToExistingCategory = categ => {
  const map = {
    [categ]: categ,
    'things to do': 'Entertainment Services',
    'things-to-do': 'Entertainment Services',
  };
  return map[categ];
};
