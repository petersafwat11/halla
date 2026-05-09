/**
 * Vendors Service
 * Business logic for public vendor marketplace
 * @module modules/vendors/vendors.service
 */

class VendorsService {
  /**
   * Get vendor categories
   * @returns {Promise<Object>}
   */
  getCategories() {
    const categories = [
      { key: 'eventPlanning', nameEn: 'Event Planning', nameAr: 'تخطيط الفعاليات' },
      { key: 'mediaProduction', nameEn: 'Media Production', nameAr: 'الإنتاج الإعلامي' },
      { key: 'giftsAndGiveaways', nameEn: 'Gifts & Giveaways', nameAr: 'الهدايا والتوزيعات' },
      { key: 'foodAndBeverages', nameEn: 'Food & Beverages', nameAr: 'الأطعمة والمشروبات' },
      { key: 'beautyAndFashion', nameEn: 'Beauty & Fashion', nameAr: 'الجمال والأزياء' },
      { key: 'logisticsAndDelivery', nameEn: 'Logistics & Delivery', nameAr: 'اللوجستيات والتوصيل' },
      { key: 'corporateServices', nameEn: 'Corporate Services', nameAr: 'خدمات الشركات' },
      { key: 'supportServices', nameEn: 'Support Services', nameAr: 'خدمات الدعم' },
      { key: 'technicalServices', nameEn: 'Technical Services', nameAr: 'الخدمات التقنية' },
      { key: 'soundLightingEntertainment', nameEn: 'Sound, Lighting & Entertainment', nameAr: 'الصوت والإضاءة والترفيه' },
      { key: 'hallsAndVenues', nameEn: 'Halls & Venues', nameAr: 'القاعات والأماكن' },
    ];
    return { categories };
  }
}

module.exports = new VendorsService();
