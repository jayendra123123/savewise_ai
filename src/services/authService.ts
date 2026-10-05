import bcrypt from 'bcryptjs';
import { User, IUser } from '../models/User';
import { FinancialProfile } from '../models/FinancialProfile';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from '../utils/jwt';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  tokens: AuthTokens;
  onboardingCompleted: boolean;
}

export class AuthService {
  static async register(
    email: string,
    password: string,
    fullName: string
  ): Promise<AuthResponse> {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      fullName
    });

    // Create an initial empty financial profile for the user
    await FinancialProfile.create({
      userId: user._id,
      monthlyIncome: 0,
      monthlySavingsTarget: 0,
      availableSpendingBudget: 0,
      currency: '₹',
      onboardingCompleted: false
    });

    const tokens = await this.issueTokens(user);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName
      },
      tokens,
      onboardingCompleted: false
    };
  }

  static async login(email: string, password: string): Promise<AuthResponse> {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    const profile = await FinancialProfile.findOne({ userId: user._id });
    const tokens = await this.issueTokens(user);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName
      },
      tokens,
      onboardingCompleted: profile?.onboardingCompleted ?? false
    };
  }

  static async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      const user = await User.findById(decoded.userId);
      if (!user || !user.refreshTokenHash) {
        throw new Error('Invalid refresh token session.');
      }

      const isTokenMatch = await bcrypt.compare(
        refreshToken,
        user.refreshTokenHash
      );
      if (!isTokenMatch) {
        throw new Error('Invalid refresh token.');
      }

      return await this.issueTokens(user);
    } catch (err: any) {
      throw new Error('Refresh token is expired or invalid.');
    }
  }

  static async logout(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { refreshTokenHash: null });
  }

  private static async issueTokens(user: IUser): Promise<AuthTokens> {
    const payload = { userId: user._id.toString(), email: user.email };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Store bcrypt hash of refresh token for secure revocation
    const tokenSalt = await bcrypt.genSalt(10);
    const refreshTokenHash = await bcrypt.hash(refreshToken, tokenSalt);
    user.refreshTokenHash = refreshTokenHash;
    await user.save();

    return { accessToken, refreshToken };
  }
}
