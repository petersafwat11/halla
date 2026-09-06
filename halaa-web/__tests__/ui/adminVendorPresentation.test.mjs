import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { JSDOM } from "jsdom";
import Gallery from "../../app/[lang]/admin-dash/vendors/[id]/_components/VendorImageGallery.jsx";
import SocialLinks from "../../app/[lang]/admin-dash/vendors/[id]/_components/VendorSocialLinks.jsx";
import Categories from "../../app/[lang]/admin-dash/vendors/[id]/_components/VendorServiceCategories.jsx";
import VendorDetailsWrapper from "../../app/[lang]/admin-dash/vendors/[id]/_components/VendorDetailsWrapper.js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import fs from "node:fs";

for (const language of ["ar", "en"]) {
  test(`${language}: admin distinguishes documents from images and shows all social platforms`, async () => {
    const i18n = createInstance();
    const resources = {};
    for (const ns of ["signup", "adminVendorDetails"]) resources[ns] = JSON.parse(fs.readFileSync(new URL(`../../localization/locales/${language}/${ns}.json`, import.meta.url)));
    await i18n.init({ lng: language, resources: { [language]: resources } });
    const render = (component) => new JSDOM(renderToStaticMarkup(React.createElement(I18nextProvider, { i18n }, component))).window.document;
    const doc = render(React.createElement(Gallery, { roleData: {
      portfolioImages: ["https://example.com/work.jpg"],
      pricePackages: ["https://example.com/package.pdf?signature=123"],
      profileFile: "https://example.com/company.docx",
      nationalIdImage: "https://example.com/id.pdf",
    }}));
    assert.equal(doc.querySelectorAll("img").length, 1);
    assert.equal(doc.querySelectorAll("a[target='_blank']").length, 3);
    const links = render(React.createElement(SocialLinks, { socialLinks: {
      whatsapp: "0501234567", linkedin: "https://linkedin.com/company/test", youtube: "https://youtube.com/@test", website: "javascript:alert(1)",
    }}));
    assert.equal(links.querySelectorAll("a").length, 3);
    assert.ok(links.querySelector('a[href="https://wa.me/966501234567"]'));
    const categories = render(React.createElement(Categories, { serviceCategories: { eventPlanning: ["flowerAndDecoration"] } }));
    assert.ok(!categories.body.textContent.includes("flowerAndDecoration"));
    const application = {
      id: "application-123", email: "vendor@example.com", phoneNumber: "0501234567", preferredLanguage: "en", status: "active",
      vendorData: {
        brandName: "Brand sentinel", ownerFullName: "Owner sentinel", vendorStatus: "pending", rating: 0,
        serviceDescription: "Description sentinel\nSecond line", taglineAr: "نبذة عربية", taglineEn: "English tagline sentinel",
        aboutAr: "وصف عربي تفصيلي", aboutEn: "English description sentinel", otherData: "Additional sentinel",
        serviceLocation: { regionNameAr: "الرياض", regionNameEn: "Riyadh", cityNameAr: "الرياض", cityNameEn: "Riyadh", coverageType: "districts", districtNames: [{ nameAr: "الملقا", nameEn: "Al Malqa" }] },
        nationalId: "1012345678", commercialRecordNumber: "1010123456",
        adminNotes: "Review notes sentinel", rejectionReason: "Reason sentinel",
        socialLinks: { website: "https://example.com/vendor" },
      },
    };
    const queryClient = new QueryClient();
    const details = render(React.createElement(QueryClientProvider, { client: queryClient }, React.createElement(VendorDetailsWrapper, { vendorData: application })));
    for (const value of [application.email, application.phoneNumber, application.vendorData.brandName, application.vendorData.ownerFullName, application.vendorData.serviceDescription, application.vendorData.taglineAr, application.vendorData.taglineEn, application.vendorData.aboutAr, application.vendorData.aboutEn, application.vendorData.otherData, application.vendorData.nationalId, application.vendorData.commercialRecordNumber, application.vendorData.adminNotes, application.vendorData.rejectionReason, "https://example.com/vendor"]) assert.ok(details.body.textContent.includes(value), value);
    assert.ok(details.body.textContent.includes(language === "ar" ? "الملقا" : "Al Malqa"));
    assert.equal(details.querySelector(".container").dir, language === "ar" ? "rtl" : "ltr");
    queryClient.clear();
  });
}
