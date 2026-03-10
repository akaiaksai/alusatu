/**
 * Translates product fields (name, description, category) using i18n keys.
 * Mock products have translations keyed by product ID.
 * API products keep their original text if no translation exists.
 */

const CATEGORY_I18N_MAP = {
  "Телефоны": "categories.phones",
  "Ноутбуки": "categories.laptops",
  "Одежда": "categories.clothing",
  "Обувь": "categories.shoes",
  "Часы": "categories.watches",
  "Сумки": "categories.bags",
  "Аксессуары": "categories.accessories",
  "Электроника": "categories.electronics",
  "Дом и сад": "categories.homeAndGarden",
};

/**
 * Returns translated category name.
 * Falls back to raw category if no mapping found.
 */
export function translateCategory(category, t) {
  const key = CATEGORY_I18N_MAP[category];
  if (key) return t(key);
  return category || "";
}

/**
 * Returns translated product fields.
 * Looks up `mockProducts.<id>.name` and `mockProducts.<id>.desc` keys.
 * Falls back to original product fields if no translation exists.
 */
export function translateProduct(product, t) {
  if (!product) return product;
  const id = product.id;
  const nameKey = `mockProducts.${id}.name`;
  const descKey = `mockProducts.${id}.desc`;

  const translatedName = t(nameKey);
  const translatedDesc = t(descKey);

  return {
    ...product,
    name: translatedName !== nameKey ? translatedName : product.name,
    description: translatedDesc !== descKey ? translatedDesc : (product.description || ""),
    categoryDisplay: translateCategory(product.category, t),
  };
}
