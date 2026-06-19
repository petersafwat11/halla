/**
 * Service Model
 * Represents vendor services in the marketplace
 */

const mongoose = require("mongoose");
const { SERVICE_CATEGORIES } = require("../src/shared/constants");

const serviceSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Service must belong to a vendor"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
      maxlength: [200, "Service name cannot exceed 200 characters"],
    },
    nameAr: {
      type: String,
      trim: true,
      maxlength: [200, "Arabic service name cannot exceed 200 characters"],
      default: null,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    descriptionAr: {
      type: String,
      trim: true,
      maxlength: [2000, "Arabic description cannot exceed 2000 characters"],
      default: null,
    },
    category: {
      type: String,
      required: [true, "Service category is required"],
      enum: SERVICE_CATEGORIES,
    },
    image: {
      type: String,
      default: null,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    currency: {
      type: String,
      default: "SAR",
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    duration: {
      type: String,
      trim: true,
      maxlength: [100, "Duration cannot exceed 100 characters"],
      default: null,
    },
    included: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active",
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    // Location - where the service is available
    serviceLocation: {
      regionId: {
        type: Number,
        default: null,
      },
      regionNameAr: {
        type: String,
        default: null,
      },
      regionNameEn: {
        type: String,
        default: null,
      },
      cityId: {
        type: Number,
        default: null,
      },
      cityNameAr: {
        type: String,
        default: null,
      },
      cityNameEn: {
        type: String,
        default: null,
      },
      districtIds: {
        type: [Number],
        default: [],
      },
      districtNames: [
        {
          nameAr: String,
          nameEn: String,
        },
      ],
      coverageType: {
        type: String,
        enum: ["region", "city", "districts"],
        default: "city",
      },
    },
    // Stats
    viewCount: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient querying
serviceSchema.index({ vendorId: 1, status: 1 });
serviceSchema.index({ vendorId: 1, status: 1, isPublic: 1, price: 1 });
serviceSchema.index({ category: 1, status: 1 });
serviceSchema.index({ "serviceLocation.regionId": 1 });
serviceSchema.index({ "serviceLocation.cityId": 1 });
serviceSchema.index({ tags: 1 });
serviceSchema.index({ price: 1 });
serviceSchema.index({ createdAt: -1 });

// Virtual for formatted price
serviceSchema.virtual("formattedPrice").get(function () {
  return `${this.price} ${this.currency}`;
});

// Pre-save middleware
serviceSchema.pre("save", function (next) {
  // Ensure tags are unique and lowercase
  if (this.tags) {
    this.tags = [...new Set(this.tags.map((tag) => tag.toLowerCase().trim()))];
  }
  next();
});

// Static method to get vendor stats
serviceSchema.statics.getVendorStats = async function (vendorId) {
  const stats = await this.aggregate([
    { $match: { vendorId: new mongoose.Types.ObjectId(vendorId) } },
    {
      $group: {
        _id: null,
        totalServices: { $sum: 1 },
        activeServices: {
          $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
        },
        disabledServices: {
          $sum: { $cond: [{ $eq: ["$status", "disabled"] }, 1, 0] },
        },
        totalViews: { $sum: "$viewCount" },
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: "$reviewCount" },
      },
    },
  ]);

  return (
    stats[0] || {
      totalServices: 0,
      activeServices: 0,
      disabledServices: 0,
      totalViews: 0,
      avgRating: 0,
      totalReviews: 0,
    }
  );
};

const Service = mongoose.model("Service", serviceSchema);

module.exports = Service;
