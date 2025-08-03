const request = require('supertest');
const app = require('../index');

describe('TimeBoss API', () => {
  it('should return a list of crews', async () => {
    const res = await request(app).get('/crews');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should handle contact form submissions', async () => {
    const res = await request(app)
      .post('/contact')
      .send({ name: 'Tester', email: 'tester@example.com', message: 'Hello, TimeBoss!' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBeDefined();
  });

  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/this-route-does-not-exist');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Not Found');
  });
});