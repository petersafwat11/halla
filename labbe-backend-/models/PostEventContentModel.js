/**
 * Post-Event Content Model
 * Manages post-event content shared by hosts with guests
 * Includes posts, likes, comments, and guest interactions
 */

const mongoose = require("mongoose");

// Comment sub-schema
const commentSchema = new mongoose.Schema(
  {
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
      required: true,
    },
    text: {
      type: String,
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
      trim: true,
    },
    images: [
      {
        url: String,
        thumbnail: String,
      },
    ],
    isHidden: {
      type: Boolean,
      default: false,
    },
    hiddenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    hiddenAt: Date,
    // FLOW-21-F02: set to true when requireApproval is enabled — hides until host approves
    pendingApproval: { type: Boolean, default: false },
  },
  {
    _id: true,
    timestamps: true,
  }
);

// Like sub-schema
const likeSchema = new mongoose.Schema(
  {
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
      required: true,
    },
    likedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// Post sub-schema
const postSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["photo", "video", "message", "gallery"],
      required: true,
    },
    content: {
      text: {
        type: String,
        maxlength: [2000, "Post text cannot exceed 2000 characters"],
        trim: true,
      },
      mediaUrl: String,
      thumbnailUrl: String,
      mediaUrls: [String], // For gallery type
    },
    order: {
      type: Number,
      default: 0,
    },
    likes: [likeSchema],
    comments: [commentSchema],
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: true,
    timestamps: true,
  }
);

// Virtual for like count
postSchema.virtual("likesCount").get(function () {
  return this.likes?.length || 0;
});

// Virtual for comment count
postSchema.virtual("commentsCount").get(function () {
  return this.comments?.filter((c) => !c.isHidden).length || 0;
});

// Main Post-Event Content Schema
const postEventContentSchema = new mongoose.Schema(
  {
    // Event reference
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Event reference is required"],
      unique: true,
      index: true,
    },

    // Host who created the content
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Host reference is required"],
      index: true,
    },

    // Content metadata
    title: {
      type: String,
      default: "Thank you for attending!",
      maxlength: [200, "Title cannot exceed 200 characters"],
      trim: true,
    },
    titleAr: {
      type: String,
      default: "شكراً لحضوركم!",
      maxlength: [200, "Arabic title cannot exceed 200 characters"],
      trim: true,
    },
    description: {
      type: String,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      trim: true,
    },
    descriptionAr: {
      type: String,
      maxlength: [1000, "Arabic description cannot exceed 1000 characters"],
      trim: true,
    },
    coverImage: String,

    // Posts array
    posts: [postSchema],

    // Settings
    settings: {
      allowComments: {
        type: Boolean,
        default: true,
      },
      allowLikes: {
        type: Boolean,
        default: true,
      },
      allowGuestImages: {
        type: Boolean,
        default: true,
      },
      requireApproval: {
        type: Boolean,
        default: false,
      },
      isPublished: {
        type: Boolean,
        default: false,
      },
      publishedAt: Date,
      expiresAt: Date, // Optional expiry
    },

    // Statistics
    stats: {
      totalViews: {
        type: Number,
        default: 0,
      },
      // FLOW-21-F05: authoritative count (unbounded); array capped at 5000 for lookup only
      uniqueVisitorCount: { type: Number, default: 0 },
      uniqueVisitors: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Guest",
        },
      ],
      totalLikes: {
        type: Number,
        default: 0,
      },
      totalComments: {
        type: Number,
        default: 0,
      },
    },

    // Multi-tenant support
    whitelabelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WhiteLabel",
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
postEventContentSchema.index({ host: 1, createdAt: -1 });
postEventContentSchema.index({ "settings.isPublished": 1 });
postEventContentSchema.index({ whitelabelId: 1 });

// Virtual for unique visitor count
postEventContentSchema.virtual("uniqueVisitorCount").get(function () {
  return this.stats?.uniqueVisitors?.length || 0;
});

// Static method to create post-event content
postEventContentSchema.statics.createForEvent = async function (
  eventId,
  hostId,
  data = {}
) {
  const existing = await this.findOne({ event: eventId });
  if (existing) {
    throw new Error("Post-event content already exists for this event");
  }

  return this.create({
    event: eventId,
    host: hostId,
    ...data,
  });
};

// Static method to get content for guest
postEventContentSchema.statics.getForGuest = async function (eventId, guestId) {
  const content = await this.findOne({
    event: eventId,
    "settings.isPublished": true,
  })
    .populate("host", "username name")
    .populate("event", "eventDetails")
    .lean();

  if (!content) return null;

  // Track visitor — FLOW-21-F05: cap uniqueVisitors array at 5000; use uniqueVisitorCount for true count
  const UNIQUE_VISITOR_CAP = 5000;
  await this.updateOne({ _id: content._id }, { $inc: { "stats.totalViews": 1 } });
  // Only push to array if under cap and not already present
  await this.updateOne(
    {
      _id: content._id,
      "stats.uniqueVisitors": { $ne: guestId },
      [`stats.uniqueVisitors.${UNIQUE_VISITOR_CAP - 1}`]: { $exists: false },
    },
    {
      $addToSet: { "stats.uniqueVisitors": guestId },
      $inc: { "stats.uniqueVisitorCount": 1 },
    }
  );

  // Add guest-specific data (whether they liked each post)
  if (content.posts) {
    content.posts = content.posts
      .filter((p) => p.isPublished)
      .map((post) => ({
        ...post,
        likesCount: post.likes?.length || 0,
        commentsCount: post.comments?.filter((c) => !c.isHidden).length || 0,
        userLiked: post.likes?.some(
          (l) => l.guest?.toString() === guestId?.toString()
        ),
        // Remove full likes/comments array for privacy
        likes: undefined,
        comments: undefined,
      }));
  }

  return content;
};

// Instance method to add a post
postEventContentSchema.methods.addPost = async function (postData) {
  const maxOrder = this.posts.reduce((max, p) => Math.max(max, p.order || 0), -1);
  this.posts.push({
    ...postData,
    order: maxOrder + 1,
  });
  return this.save();
};

// Instance method to toggle like
postEventContentSchema.methods.toggleLike = async function (postId, guestId) {
  const post = this.posts.id(postId);
  if (!post) {
    throw new Error("Post not found");
  }

  if (!this.settings.allowLikes) {
    throw new Error("Likes are disabled for this event");
  }

  const existingLikeIndex = post.likes.findIndex(
    (l) => l.guest.toString() === guestId.toString()
  );

  let liked;
  if (existingLikeIndex > -1) {
    post.likes.splice(existingLikeIndex, 1);
    this.stats.totalLikes = Math.max(0, this.stats.totalLikes - 1);
    liked = false;
  } else {
    post.likes.push({ guest: guestId });
    this.stats.totalLikes += 1;
    liked = true;
  }

  await this.save();
  return { liked, likesCount: post.likes.length };
};

// Instance method to add comment
postEventContentSchema.methods.addComment = async function (
  postId,
  guestId,
  commentData
) {
  const post = this.posts.id(postId);
  if (!post) {
    throw new Error("Post not found");
  }

  if (!this.settings.allowComments) {
    throw new Error("Comments are disabled for this event");
  }

  const comment = {
    guest: guestId,
    ...commentData,
  };

  post.comments.push(comment);
  this.stats.totalComments += 1;

  await this.save();
  return post.comments[post.comments.length - 1];
};

// Instance method to publish content
postEventContentSchema.methods.publish = async function () {
  this.settings.isPublished = true;
  this.settings.publishedAt = new Date();
  return this.save();
};

const PostEventContent = mongoose.model(
  "PostEventContent",
  postEventContentSchema
);

module.exports = PostEventContent;
