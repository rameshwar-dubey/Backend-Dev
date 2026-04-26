let requests = 0;

exports.trackRequest = () => {
  requests++;
};

exports.getMetrics = () => ({
  requests
});