const CircuitBreaker = require("opossum");

const paymentAPI = async (data) => {
  // simulate external API
};

const breaker = new CircuitBreaker(paymentAPI, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 5000
});

module.exports = breaker;