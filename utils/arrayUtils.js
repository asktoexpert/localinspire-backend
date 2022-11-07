// Array.prototype.paginate = function (pageNumber, limit) {
//   const start = (pageNumber - 1) * limit;
//   const end = limit * pageNumber;
//   return this.slice(start, end)
// }

exports.paginate = async function ({ array, page, limit }) {
  const start = (page - 1) * limit;
  const end = limit * page;
  console.log({ start, end });
  return Promise.resolve(array.slice(start, end));
};
