import app from './app';
import { Env } from './env';

const PORT = Number(Env.PORT);

// Start server if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
