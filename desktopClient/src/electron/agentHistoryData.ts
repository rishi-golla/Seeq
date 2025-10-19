import mongoose, { Schema, Document } from 'mongoose';

export interface IAgentHistoryData extends Document {
  description: string;
  filePaths: string[];
  createdAt: Date;
  updatedAt: Date;
}

const agentHistoryDataSchema = new Schema<IAgentHistoryData>({
  description: {
    type: String,
    required: true,
    maxlength: 50,
    trim: true
  },
  filePaths: {
    type: [String],
    required: true,
    default: []
  }
}, {
  timestamps: true
});

export const AgentHistoryData = mongoose.model<IAgentHistoryData>('AgentHistoryData', agentHistoryDataSchema);

export { agentHistoryDataSchema };
