// This function generates random 4 digits
exports.genRandom4Digits = function () {
  const shuffle = arr => {
    for (
      var j, x, i = arr.length;
      i;
      j = Math.floor(Math.random() * i), x = arr[--i], arr[i] = arr[j], arr[j] = x
    );
    return arr;
  };
  const digits = '123456789'.split('');
  const first = shuffle(digits).pop();
  // Add "0" to the array
  digits.push('0');
  return parseInt(first + shuffle(digits).join('').substring(0, 3), 10);
};
