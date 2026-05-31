/**
 * Post-Event Content Model
 * Manages post-event content shared by hosts with guests
 * Includes media (photos/videos), likes, comments, and guest interactions.
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

// Media item sub-schema (one record per uploaded photo or video)
const mediaItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["photo", "video"],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    thumbnailUrl: String,
    mimeType: String,
    size: Number,
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

mediaItemSchema.virtual("likesCount").get(function () {
  return this.likes?.length || 0;
});

mediaItemSchema.virtual("commentsCount").get(function () {
  return this.comments?.filter((c) => !c.isHidden).length || 0;
});

// Canonical Taqnyat-template reference — identical shape to
// EventModel.canonicalTaqnyatTemplateSchema (Event.taqnyatTemplate.templateRef).
// Holds the host's chosen WhatsApp template for post-event access-link
// dispatch. Resolved at send time by messaging.formatting.resolveTaqnyatTemplate.
const taqnyatTemplateSchema = new mongoose.Schema(
  {
    templateRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TaqnyatTemplate",
      default: null,
    },
  },
  { _id: false }
);

// Main Post-Event Content Schema
const postEventContentSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Event reference is required"],
      unique: true,
      index: true,
    },

    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Host reference is required"],
      index: true,
    },

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

    // Unified media array (photos + videos in one place, distinguished by `type`).
    media: [mediaItemSchema],

    // Post-level interactions. The post-event content IS the post (one per
    // event): a single caption + media gallery, one like set, one comment
    // thread — Facebook-style. Per-media `likes`/`comments` on mediaItemSchema
    // are retained for backward compatibility with the mobile app's per-media
    // endpoints, but the web flow uses these post-level arrays.
    likes: [likeSchema],
    comments: [commentSchema],

    // Host's chosen Taqnyat WhatsApp template for access-link dispatch.
    taqnyatTemplate: {
      type: taqnyatTemplateSchema,
      default: () => ({}),
    },

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
      expiresAt: Date,
    },

    stats: {
      totalViews: {
        type: Number,
        default: 0,
      },
      uniqueVisitorCount: { type: Number, default: 0 },
      // Capped at 5000; uniqueVisitorCount is the authoritative count.
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
      // Persisted summary of the most recent access-link dispatch, written by
      // post-event.dispatch.service.sendBulkAccessLinks. Lets the host's
      // published view show "X guests notified" on revisit (the dispatch
      // breakdown is otherwise only in the HTTP response + audit log).
      lastSend: {
        at: Date,
        total: { type: Number, default: 0 },
        whatsapp: { type: Number, default: 0 },
        sms: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
        audience: String,
      },
    },

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

postEventContentSchema.index({ host: 1, createdAt: -1 });
postEventContentSchema.index({ "settings.isPublished": 1 });
postEventContentSchema.index({ whitelabelId: 1 });

postEventContentSchema.virtual("uniqueVisitorCount").get(function () {
  return this.stats?.uniqueVisitors?.length || 0;
});

// Post-level interaction counts (the whole post, not a single media item).
postEventContentSchema.virtual("postLikesCount").get(function () {
  return this.likes?.length || 0;
});

postEventContentSchema.virtual("postCommentsCount").get(function () {
  return this.comments?.filter((c) => !c.isHidden).length || 0;
});

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

postEventContentSchema.statics.getForGuest = async function (eventId, guestId) {
  const content = await this.findOne({
    event: eventId,
    "settings.isPublished": true,
  })
    .populate("host", "username name")
    .populate("event", "eventDetails")
    .lean();

  if (!content) return null;

  const UNIQUE_VISITOR_CAP = 5000;
  await this.updateOne({ _id: content._id }, { $inc: { "stats.totalViews": 1 } });
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

  if (content.media) {
    content.media = content.media
      .filter((m) => m.isPublished)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((item) => ({
        ...item,
        likesCount: item.likes?.length || 0,
        commentsCount: item.comments?.filter((c) => !c.isHidden).length || 0,
        userLiked: item.likes?.some(
          (l) => l.guest?.toString() === guestId?.toString()
        ),
        likes: undefined,
        comments: undefined,
      }));
  }

  // Post-level interaction summary (one like set + one comment thread for the
  // whole post). The full arrays are stripped; the guest gets counts + their
  // own like state. Comments are fetched separately via getPostComments.
  content.likesCount = content.likes?.length || 0;
  content.commentsCount =
    content.comments?.filter((c) => !c.isHidden).length || 0;
  content.userLiked =
    content.likes?.some(
      (l) => l.guest?.toString() === guestId?.toString()
    ) || false;
  content.likes = undefined;
  content.comments = undefined;

  return content;
};

// Toggle the current guest's like on the post itself (not a media item).
postEventContentSchema.methods.togglePostLike = async function (guestId) {
  if (!this.settings.allowLikes) {
    throw new Error("Likes are disabled for this event");
  }

  const existingLikeIndex = this.likes.findIndex(
    (l) => l.guest.toString() === guestId.toString()
  );

  let liked;
  if (existingLikeIndex > -1) {
    this.likes.splice(existingLikeIndex, 1);
    this.stats.totalLikes = Math.max(0, this.stats.totalLikes - 1);
    liked = false;
  } else {
    this.likes.push({ guest: guestId });
    this.stats.totalLikes += 1;
    liked = true;
  }

  await this.save();
  return { liked, likesCount: this.likes.length };
};

// Add a comment to the post itself (not a media item).
postEventContentSchema.methods.addPostComment = async function (
  guestId,
  commentData
) {
  if (!this.settings.allowComments) {
    throw new Error("Comments are disabled for this event");
  }

  const comment = {
    guest: guestId,
    ...commentData,
  };

  this.comments.push(comment);
  this.stats.totalComments += 1;

  await this.save();
  return this.comments[this.comments.length - 1];
};

// Add a media item (photo or video).
postEventContentSchema.methods.addMedia = async function (mediaData) {
  const maxOrder = this.media.reduce((max, m) => Math.max(max, m.order || 0), -1);
  this.media.push({
    ...mediaData,
    order: maxOrder + 1,
  });
  await this.save();
  return this.media[this.media.length - 1];
};

// Remove a media item by id. Mongoose 6+ requires `.pull()` on the parent
// array — `subdoc.remove()` is no longer a function.
postEventContentSchema.methods.removeMedia = async function (mediaId) {
  const item = this.media.id(mediaId);
  if (!item) return false;
  this.media.pull(mediaId);
  await this.save();
  return true;
};

postEventContentSchema.methods.toggleLike = async function (mediaId, guestId) {
  const item = this.media.id(mediaId);
  if (!item) {
    throw new Error("Media not found");
  }

  if (!this.settings.allowLikes) {
    throw new Error("Likes are disabled for this event");
  }

  const existingLikeIndex = item.likes.findIndex(
    (l) => l.guest.toString() === guestId.toString()
  );

  let liked;
  if (existingLikeIndex > -1) {
    item.likes.splice(existingLikeIndex, 1);
    this.stats.totalLikes = Math.max(0, this.stats.totalLikes - 1);
    liked = false;
  } else {
    item.likes.push({ guest: guestId });
    this.stats.totalLikes += 1;
    liked = true;
  }

  await this.save();
  return { liked, likesCount: item.likes.length };
};

postEventContentSchema.methods.addComment = async function (
  mediaId,
  guestId,
  commentData
) {
  const item = this.media.id(mediaId);
  if (!item) {
    throw new Error("Media not found");
  }

  if (!this.settings.allowComments) {
    throw new Error("Comments are disabled for this event");
  }

  const comment = {
    guest: guestId,
    ...commentData,
  };

  item.comments.push(comment);
  this.stats.totalComments += 1;

  await this.save();
  return item.comments[item.comments.length - 1];
};

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
