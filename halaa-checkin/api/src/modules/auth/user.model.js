/**
 * @halaa-checkin/api
 * User Mongoose Model.
 * Represents named administrative or reception operators.
 */

import mongoose from 'mongoose';
import { ROLES, ROLE_VALUES } from '@halaa-checkin/contracts';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 1,
      maxlength: 100,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Omitted by default in queries
    },
    role: {
      type: String,
      enum: ROLE_VALUES,
      default: ROLES.RECEPTION,
      required: true,
    },
    assignedEventIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
      default: [],
    },
    disabledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ disabledAt: 1 });

/**
 * Convert user document to safe DTO without password hash or internals.
 *
 * @returns {{ id: string, username: string, displayName: string, role: string, assignedEventIds: string[] }}
 */
userSchema.methods.toSafeDto = function () {
  return {
    id: this._id.toString(),
    username: this.username,
    displayName: this.displayName,
    role: this.role,
    assignedEventIds: (this.assignedEventIds || []).map((id) => id.toString()),
  };
};

export const User = mongoose.models.User || mongoose.model('User', userSchema);
