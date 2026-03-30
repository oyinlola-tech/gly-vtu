declare module 'zxcvbn' {
  export interface ZXCVBNFeedback {
    warning?: string;
    suggestions?: string[];
  }

  export interface ZXCVBNResult {
    score: number;
    feedback: ZXCVBNFeedback;
  }

  export default function zxcvbn(password: string, userInputs?: string[]): ZXCVBNResult;
}
