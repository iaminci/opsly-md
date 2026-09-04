import { _encatch, type QuestionResponse } from "@encatch/web-sdk";

export interface FeedbackFormSchema {
  formConfigurationId: string;
  categoryQuestionId: string;
  categoryChoices: string[];
  commentsQuestionId: string;
  imageQuestionId?: string;
  maxCommentLength: number;
}

export const FEEDBACK_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function collectQuestionNodes(node: unknown, out: Record<string, unknown>[]): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectQuestionNodes(item, out);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (typeof obj.id === "string" && typeof obj.type === "string") {
    out.push(obj);
  }
  for (const value of Object.values(obj)) {
    collectQuestionNodes(value, out);
  }
}

function extractChoices(question: Record<string, unknown>): string[] {
  const raw =
    question.choices ??
    question.options ??
    question.answers ??
    question.values;
  if (!Array.isArray(raw)) return [];

  const labels: string[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      labels.push(item);
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const choice = item as Record<string, unknown>;
    const label =
      choice.label ??
      choice.text ??
      choice.title ??
      choice.value ??
      choice.name;
    if (typeof label === "string" && label.trim()) {
      labels.push(label.trim());
    }
  }
  return labels;
}

function readFormConfigurationId(
  formConfig: Record<string, unknown>
): string | null {
  const candidates = [
    formConfig.formConfigurationId,
    formConfig.feedbackConfigurationId,
    formConfig.configurationId,
    formConfig.id,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
}

export function parseFeedbackFormConfig(
  formConfig: Record<string, unknown>
): FeedbackFormSchema | null {
  const questions: Record<string, unknown>[] = [];
  collectQuestionNodes(formConfig, questions);

  const categoryQuestion = questions.find((question) => {
    const type = String(question.type ?? "");
    return type === "single_choice" || type === "single_choice_other";
  });
  const commentsQuestion = questions.find((question) => {
    const type = String(question.type ?? "");
    return type === "long_text" || type === "long_text_other";
  });
  const imageQuestion = questions.find((question) => {
    const type = String(question.type ?? "");
    return (
      type === "file_upload" ||
      type === "image_upload" ||
      type === "image" ||
      type === "file"
    );
  });

  const formConfigurationId = readFormConfigurationId(formConfig);
  if (!formConfigurationId || !categoryQuestion || !commentsQuestion) {
    return null;
  }

  const categoryChoices = extractChoices(categoryQuestion);
  if (categoryChoices.length === 0) {
    return null;
  }

  const maxCommentLength =
    typeof commentsQuestion.maxLength === "number" &&
    commentsQuestion.maxLength > 0
      ? commentsQuestion.maxLength
      : 5000;

  return {
    formConfigurationId,
    categoryQuestionId: String(categoryQuestion.id),
    categoryChoices,
    commentsQuestionId: String(commentsQuestion.id),
    imageQuestionId:
      imageQuestion?.id != null ? String(imageQuestion.id) : undefined,
    maxCommentLength,
  };
}

export interface NativeFeedbackSubmission {
  category: string;
  comments: string;
  image?: File | null;
}

export async function submitNativeFeedback(
  schema: FeedbackFormSchema,
  submission: NativeFeedbackSubmission
): Promise<void> {
  const questions: QuestionResponse[] = [
    {
      questionId: schema.categoryQuestionId,
      answer: { singleChoice: submission.category },
    },
    {
      questionId: schema.commentsQuestionId,
      answer: { longText: submission.comments },
    },
  ];

  if (submission.image && schema.imageQuestionId) {
    const uploaded = await _encatch.uploadFile({
      feedbackConfigurationId: schema.formConfigurationId,
      questionId: schema.imageQuestionId,
      file: submission.image,
      fileName: submission.image.name,
    });
    questions.push({
      questionId: schema.imageQuestionId,
      answer: {
        fileUpload: [
          {
            fileUrl: uploaded.fileUrl,
            fileName: submission.image.name,
            fileSizeMb: submission.image.size / (1024 * 1024),
            mimeType: submission.image.type || undefined,
          },
        ],
      },
    });
  }

  _encatch.submitForm({
    triggerType: "manual",
    formDetails: {
      formConfigurationId: schema.formConfigurationId,
      response: { questions },
    },
  });
}
