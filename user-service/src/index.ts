import 'module-alias/register';
import app from './app';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.listen(PORT, () => {
  console.log(`user-service listening on port ${PORT}`);
});
