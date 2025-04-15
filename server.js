const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 9876
const WINDOW_SIZE = 10;
const window = [];
const validIds = {
  p: 'http://20.244.56.144/test/prime',
  f: 'http://20.244.56.144/test/fibo',
  e: 'http://20.244.56.144/test/even',
  r: 'http://20.244.56.144/test/rand'
};

function addUniqueNumbers(newNumbers) {
  const set = new Set(window);
  for (const num of newNumbers) {
    if (!set.has(num)) {
      if (window.length >= WINDOW_SIZE) {
        window.shift();
      }
      window.push(num);
      set.add(num);
    }
  }
}

app.get('/numbers/:numberid', async (req, res) => {
  const id = req.params.numberid;

  if (!validIds[id]) {
    return res.status(400).json({ error: 'Invalid number ID' });
  }

  const prevState = [...window];
  let newNumbers = [];

  const sourceUrl = validIds[id];

  try {
    const response = await axios.get(sourceUrl, { timeout: 500 });
    newNumbers = response.data.numbers || [];
  } catch (err) {
    newNumbers = [];
  }

  addUniqueNumbers(newNumbers);
  const currState = [...window];

  const average =
    currState.length > 0
      ? parseFloat((currState.reduce((a, b) => a + b, 0) / currState.length).toFixed(2))
      : 0.0;

  res.json({
    windowPrevState: prevState,
    windowCurrState: currState,
    numbers: newNumbers,
    avg: average
  });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});