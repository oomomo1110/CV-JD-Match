export type RevisedBullet = {
  original: string;
  revised: string;
  reason: string;
  needs_user_confirmation: boolean;
};

export type OptimizationResult = {
  jd_keywords: string[];
  matched_points: string[];
  missing_points: string[];
  revised_bullets: RevisedBullet[];
  follow_up_questions: string[];
};

export type OptimizeResumeRequest = {
  resumeText: string;
  jdText: string;
};

export type FollowUpAnswer = {
  question: string;
  answer: string;
};

export type RefineOptimizationRequest = {
  resumeText: string;
  jdText: string;
  optimizationResult: OptimizationResult;
  followUpAnswers: FollowUpAnswer[];
};

export type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

export type FollowUpChatRequest = {
  messages: ChatMessage[];
  result: OptimizationResult;
  nextQuestion?: string;
};

export type FollowUpChatResponse = {
  message: string;
  next_question?: string;
};
