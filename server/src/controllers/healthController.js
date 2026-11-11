export const getHealth = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'JalGyan API is running',
    timestamp: new Date().toISOString(),
  });
};
