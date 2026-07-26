import app from './app';

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`[Horologue Backend] Server listening at http://localhost:${port}`);
});
