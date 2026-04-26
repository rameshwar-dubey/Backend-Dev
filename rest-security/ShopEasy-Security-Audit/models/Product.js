const productSchema = new mongoose.Schema({
  name: String,
  price: {
    type: Number,
    min: 0   // 🔥 prevents negative price
  }
});