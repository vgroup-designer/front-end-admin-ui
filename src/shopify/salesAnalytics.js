function sumRevenue(orders) {
  return orders.reduce((sum, order) => sum + Number(order.total_price ?? 0), 0);
}

function topProductsByOrderCount(orders, limit) {
  const counts = new Map();
  for (const order of orders) {
    const productsInOrder = new Set((order.line_items ?? []).map((item) => item.title));
    for (const title of productsInOrder) {
      counts.set(title, (counts.get(title) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([title, orderCount]) => ({ title, orderCount }));
}

// Pure: takes already-fetched orders for the current and equivalent prior period.
export function computeSalesSummary(currentOrders, previousOrders) {
  const totalRevenue = sumRevenue(currentOrders);
  const previousRevenue = sumRevenue(previousOrders);
  const percentChangeVsPreviousPeriod = previousRevenue === 0 ? null : ((totalRevenue - previousRevenue) / previousRevenue) * 100;

  return {
    orderCount: currentOrders.length,
    totalRevenue,
    percentChangeVsPreviousPeriod,
    topProducts: topProductsByOrderCount(currentOrders, 3),
  };
}
