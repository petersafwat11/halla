/**
 * PDF Generator Service
 * Generates PDF reports for email attachments
 * Uses pdfkit for PDF generation
 */

const PDFDocument = require("pdfkit");

// ============================================
// PDF STYLES
// ============================================

const COLORS = {
  primary: "#6366f1",
  secondary: "#8b5cf6",
  text: "#374151",
  textLight: "#6b7280",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  border: "#e5e7eb",
  background: "#f9fafb",
};

const FONTS = {
  regular: "Helvetica",
  bold: "Helvetica-Bold",
};

// ============================================
// PDF GENERATOR CLASS
// ============================================

class PDFGenerator {
  constructor() {
    this.doc = null;
    this.lang = "ar";
    this.isRTL = true;
  }

  /**
   * Initialize a new PDF document
   */
  createDocument(options = {}) {
    this.lang = options.lang || "ar";
    this.isRTL = this.lang === "ar";

    this.doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: options.title || "Halla Report",
        Author: "Halla Platform",
        Creator: "Halla PDF Generator",
      },
    });

    return this;
  }

  /**
   * Add header to PDF
   */
  addHeader(title, subtitle = null) {
    const pageWidth = this.doc.page.width - 100;

    // Header background
    this.doc.rect(0, 0, this.doc.page.width, 100).fill(COLORS.primary);

    // Title
    this.doc
      .font(FONTS.bold)
      .fontSize(24)
      .fillColor("white")
      .text(title, 50, 35, {
        width: pageWidth,
        align: this.isRTL ? "right" : "left",
      });

    // Subtitle
    if (subtitle) {
      this.doc
        .font(FONTS.regular)
        .fontSize(12)
        .fillColor("white")
        .text(subtitle, 50, 65, {
          width: pageWidth,
          align: this.isRTL ? "right" : "left",
        });
    }

    // Reset position
    this.doc.y = 120;

    return this;
  }

  /**
   * Add section title
   */
  addSectionTitle(title) {
    const pageWidth = this.doc.page.width - 100;

    this.doc
      .font(FONTS.bold)
      .fontSize(16)
      .fillColor(COLORS.primary)
      .text(title, 50, this.doc.y + 20, {
        width: pageWidth,
        align: this.isRTL ? "right" : "left",
      });

    this.doc.y += 10;

    // Underline
    this.doc
      .moveTo(50, this.doc.y)
      .lineTo(this.doc.page.width - 50, this.doc.y)
      .strokeColor(COLORS.border)
      .stroke();

    this.doc.y += 15;

    return this;
  }

  /**
   * Add paragraph text
   */
  addParagraph(text) {
    const pageWidth = this.doc.page.width - 100;

    this.doc
      .font(FONTS.regular)
      .fontSize(11)
      .fillColor(COLORS.text)
      .text(text, 50, this.doc.y, {
        width: pageWidth,
        align: this.isRTL ? "right" : "left",
        lineGap: 5,
      });

    this.doc.y += 15;

    return this;
  }

  /**
   * Add statistics row
   */
  addStatsRow(stats) {
    const startY = this.doc.y + 10;
    const boxWidth =
      (this.doc.page.width - 100 - (stats.length - 1) * 10) / stats.length;
    const boxHeight = 70;

    stats.forEach((stat, index) => {
      const x = 50 + index * (boxWidth + 10);

      // Box background
      this.doc
        .roundedRect(x, startY, boxWidth, boxHeight, 5)
        .fill(COLORS.background);

      // Value
      this.doc
        .font(FONTS.bold)
        .fontSize(24)
        .fillColor(stat.color || COLORS.primary)
        .text(stat.value, x, startY + 15, {
          width: boxWidth,
          align: "center",
        });

      // Label
      this.doc
        .font(FONTS.regular)
        .fontSize(10)
        .fillColor(COLORS.textLight)
        .text(stat.label, x, startY + 45, {
          width: boxWidth,
          align: "center",
        });
    });

    this.doc.y = startY + boxHeight + 20;

    return this;
  }

  /**
   * Add table
   */
  addTable(headers, rows, options = {}) {
    const pageWidth = this.doc.page.width - 100;
    const colWidth = pageWidth / headers.length;
    const rowHeight = 30;
    let startY = this.doc.y + 10;

    // Table header
    this.doc.rect(50, startY, pageWidth, rowHeight).fill(COLORS.background);

    headers.forEach((header, index) => {
      const x = 50 + index * colWidth;
      this.doc
        .font(FONTS.bold)
        .fontSize(10)
        .fillColor(COLORS.text)
        .text(header, x + 5, startY + 10, {
          width: colWidth - 10,
          align: this.isRTL ? "right" : "left",
        });
    });

    startY += rowHeight;

    // Table rows
    rows.forEach((row, rowIndex) => {
      // Alternate row background
      if (rowIndex % 2 === 0) {
        this.doc.rect(50, startY, pageWidth, rowHeight).fill("#ffffff");
      }

      // Row border
      this.doc
        .moveTo(50, startY + rowHeight)
        .lineTo(50 + pageWidth, startY + rowHeight)
        .strokeColor(COLORS.border)
        .stroke();

      row.forEach((cell, colIndex) => {
        const x = 50 + colIndex * colWidth;
        this.doc
          .font(FONTS.regular)
          .fontSize(10)
          .fillColor(COLORS.text)
          .text(String(cell), x + 5, startY + 10, {
            width: colWidth - 10,
            align: this.isRTL ? "right" : "left",
          });
      });

      startY += rowHeight;

      // Check for page break
      if (startY > this.doc.page.height - 100) {
        this.doc.addPage();
        startY = 50;
      }
    });

    this.doc.y = startY + 20;

    return this;
  }

  /**
   * Add key-value list
   */
  addKeyValueList(items) {
    const pageWidth = this.doc.page.width - 100;

    items.forEach((item) => {
      this.doc
        .font(FONTS.bold)
        .fontSize(10)
        .fillColor(COLORS.textLight)
        .text(`${item.key}:`, 50, this.doc.y, {
          width: pageWidth,
          align: this.isRTL ? "right" : "left",
          continued: true,
        })
        .font(FONTS.regular)
        .fillColor(COLORS.text)
        .text(` ${item.value}`, {
          align: this.isRTL ? "right" : "left",
        });

      this.doc.y += 5;
    });

    this.doc.y += 10;

    return this;
  }

  /**
   * Add footer
   */
  addFooter() {
    const pageCount = this.doc.bufferedPageRange().count;
    const pageWidth = this.doc.page.width;
    const pageHeight = this.doc.page.height;

    for (let i = 0; i < pageCount; i++) {
      this.doc.switchToPage(i);

      // Footer line
      this.doc
        .moveTo(50, pageHeight - 40)
        .lineTo(pageWidth - 50, pageHeight - 40)
        .strokeColor(COLORS.border)
        .stroke();

      // Page number
      this.doc
        .font(FONTS.regular)
        .fontSize(9)
        .fillColor(COLORS.textLight)
        .text(`${i + 1} / ${pageCount}`, 50, pageHeight - 30, {
          width: pageWidth - 100,
          align: "center",
        });

      // Generated date
      this.doc
        .font(FONTS.regular)
        .fontSize(8)
        .fillColor(COLORS.textLight)
        .text(
          this.isRTL ? "تم إنشاؤه بواسطة هلا" : "Generated by Halla",
          50,
          pageHeight - 30,
          {
            width: pageWidth - 100,
            align: this.isRTL ? "right" : "left",
          }
        );
    }

    return this;
  }

  /**
   * Add page break
   */
  addPageBreak() {
    this.doc.addPage();
    return this;
  }

  /**
   * Finalize and get PDF buffer
   */
  async finalize() {
    return new Promise((resolve, reject) => {
      const chunks = [];

      this.doc.on("data", (chunk) => chunks.push(chunk));
      this.doc.on("end", () => resolve(Buffer.concat(chunks)));
      this.doc.on("error", reject);

      this.addFooter();
      this.doc.end();
    });
  }
}

// ============================================
// REPORT GENERATORS
// ============================================

/**
 * Generate daily report PDF for admins
 */
async function generateDailyReportPDF(data, lang = "ar") {
  const isAr = lang === "ar";
  const pdf = new PDFGenerator();

  pdf.createDocument({ title: isAr ? "التقرير اليومي" : "Daily Report", lang });

  pdf.addHeader(isAr ? "التقرير اليومي" : "Daily Report", data.date);

  // Summary stats
  pdf.addSectionTitle(isAr ? "ملخص النشاط" : "Activity Summary");
  pdf.addStatsRow([
    { label: isAr ? "مستخدمين جدد" : "New Users", value: data.newUsers || 0 },
    {
      label: isAr ? "فعاليات جديدة" : "New Events",
      value: data.newEvents || 0,
    },
    {
      label: isAr ? "الإيرادات" : "Revenue",
      value: data.totalRevenue || "0 SAR",
    },
    {
      label: isAr ? "تذاكر الدعم" : "Support Tickets",
      value: data.openTickets || 0,
    },
  ]);

  // User breakdown
  if (data.userBreakdown) {
    pdf.addSectionTitle(isAr ? "تفاصيل المستخدمين" : "User Breakdown");
    pdf.addTable(
      [isAr ? "النوع" : "Type", isAr ? "العدد" : "Count"],
      Object.entries(data.userBreakdown).map(([key, value]) => [key, value])
    );
  }

  // Pending items
  if (data.pendingItems && data.pendingItems.length > 0) {
    pdf.addSectionTitle(isAr ? "العناصر المعلقة" : "Pending Items");
    pdf.addTable(
      [
        isAr ? "العنصر" : "Item",
        isAr ? "الحالة" : "Status",
        isAr ? "التاريخ" : "Date",
      ],
      data.pendingItems.map((item) => [item.title, item.status, item.date])
    );
  }

  return pdf.finalize();
}

/**
 * Generate weekly report PDF for hosts/vendors
 */
async function generateWeeklyReportPDF(data, lang = "ar") {
  const isAr = lang === "ar";
  const pdf = new PDFGenerator();

  pdf.createDocument({
    title: isAr ? "التقرير الأسبوعي" : "Weekly Report",
    lang,
  });

  pdf.addHeader(isAr ? "التقرير الأسبوعي" : "Weekly Report", data.weekRange);

  // Stats based on role
  pdf.addSectionTitle(isAr ? "ملخص الأسبوع" : "Weekly Summary");

  if (data.role === "host") {
    pdf.addStatsRow([
      {
        label: isAr ? "إجمالي الضيوف" : "Total Guests",
        value: data.totalGuests || 0,
      },
      {
        label: isAr ? "تأكيدات الحضور" : "Confirmed RSVPs",
        value: data.confirmedRsvps || 0,
        color: COLORS.success,
      },
      {
        label: isAr ? "دعوات مرسلة" : "Invitations Sent",
        value: data.invitationsSent || 0,
      },
    ]);
  } else {
    pdf.addStatsRow([
      {
        label: isAr ? "مشاهدات الملف" : "Profile Views",
        value: data.profileViews || 0,
      },
      { label: isAr ? "استفسارات" : "Inquiries", value: data.inquiries || 0 },
    ]);
  }

  // Upcoming events
  if (data.upcomingEvents && data.upcomingEvents.length > 0) {
    pdf.addSectionTitle(isAr ? "الفعاليات القادمة" : "Upcoming Events");
    pdf.addTable(
      [
        isAr ? "الفعالية" : "Event",
        isAr ? "التاريخ" : "Date",
        isAr ? "الضيوف" : "Guests",
      ],
      data.upcomingEvents.map((event) => [
        event.title,
        event.date,
        event.guestCount,
      ])
    );
  }

  // Activity log
  if (data.activityLog && data.activityLog.length > 0) {
    pdf.addSectionTitle(isAr ? "سجل النشاط" : "Activity Log");
    pdf.addTable(
      [isAr ? "النشاط" : "Activity", isAr ? "التاريخ" : "Date"],
      data.activityLog.map((activity) => [activity.description, activity.date])
    );
  }

  return pdf.finalize();
}

/**
 * Generate invitation report PDF
 */
async function generateInvitationReportPDF(data, lang = "ar") {
  const isAr = lang === "ar";
  const pdf = new PDFGenerator();

  pdf.createDocument({
    title: isAr ? "تقرير الدعوات" : "Invitation Report",
    lang,
  });

  pdf.addHeader(isAr ? "تقرير الدعوات" : "Invitation Report", data.eventTitle);

  // Event details
  pdf.addSectionTitle(isAr ? "تفاصيل الفعالية" : "Event Details");
  pdf.addKeyValueList([
    { key: isAr ? "اسم الفعالية" : "Event Name", value: data.eventTitle },
    { key: isAr ? "التاريخ" : "Date", value: data.eventDate },
    { key: isAr ? "الوقت" : "Time", value: data.eventTime },
    { key: isAr ? "المكان" : "Venue", value: data.venue || "-" },
  ]);

  // RSVP stats
  pdf.addSectionTitle(isAr ? "إحصائيات الردود" : "RSVP Statistics");
  pdf.addStatsRow([
    {
      label: isAr ? "إجمالي المدعوين" : "Total Invited",
      value: data.totalInvited || 0,
    },
    {
      label: isAr ? "مؤكد" : "Confirmed",
      value: data.confirmed || 0,
      color: COLORS.success,
    },
    {
      label: isAr ? "اعتذر" : "Declined",
      value: data.declined || 0,
      color: COLORS.danger,
    },
    {
      label: isAr ? "بانتظار الرد" : "Pending",
      value: data.pending || 0,
      color: COLORS.warning,
    },
  ]);

  // Guest list
  if (data.guests && data.guests.length > 0) {
    pdf.addSectionTitle(isAr ? "قائمة الضيوف" : "Guest List");

    const statusLabels = {
      confirmed: isAr ? "مؤكد" : "Confirmed",
      declined: isAr ? "اعتذر" : "Declined",
      pending: isAr ? "بانتظار" : "Pending",
      maybe: isAr ? "ربما" : "Maybe",
    };

    pdf.addTable(
      [
        isAr ? "الاسم" : "Name",
        isAr ? "الهاتف" : "Phone",
        isAr ? "الحالة" : "Status",
        isAr ? "عدد المرافقين" : "Companions",
      ],
      data.guests.map((guest) => [
        guest.name,
        guest.phone || "-",
        statusLabels[guest.status] || guest.status,
        guest.companions || 0,
      ])
    );
  }

  return pdf.finalize();
}

/**
 * Generate guest list PDF
 */
async function generateGuestListPDF(data, lang = "ar") {
  const isAr = lang === "ar";
  const pdf = new PDFGenerator();

  pdf.createDocument({ title: isAr ? "قائمة الضيوف" : "Guest List", lang });

  pdf.addHeader(isAr ? "قائمة الضيوف" : "Guest List", data.eventTitle);

  // Guest table
  const statusLabels = {
    confirmed: isAr ? "مؤكد" : "Confirmed",
    declined: isAr ? "اعتذر" : "Declined",
    pending: isAr ? "بانتظار" : "Pending",
    maybe: isAr ? "ربما" : "Maybe",
    checked_in: isAr ? "وصل" : "Checked In",
  };

  pdf.addTable(
    [
      isAr ? "#" : "#",
      isAr ? "الاسم" : "Name",
      isAr ? "الهاتف" : "Phone",
      isAr ? "الحالة" : "Status",
      isAr ? "المرافقين" : "Companions",
    ],
    data.guests.map((guest, index) => [
      index + 1,
      guest.name,
      guest.phone || "-",
      statusLabels[guest.status] || guest.status,
      guest.companions || 0,
    ])
  );

  return pdf.finalize();
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  PDFGenerator,
  generateDailyReportPDF,
  generateWeeklyReportPDF,
  generateInvitationReportPDF,
  generateGuestListPDF,
};
