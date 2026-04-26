function computeFraudIndicators({ amountCents, recentCountInMinute }) {
  const indicators = [];

  if (amountCents >= 500000) {
    indicators.push({
      code: "HIGH_AMOUNT",
      score: 60,
      details: { amountCents },
    });
  }

  if (recentCountInMinute >= 5) {
    indicators.push({
      code: "RAPID_FIRE",
      score: 50,
      details: { recentCountInMinute },
    });
  }

  return indicators;
}

module.exports = { computeFraudIndicators };
