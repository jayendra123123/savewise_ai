import { FinancialProfile, IFinancialProfile } from '../models/FinancialProfile';
import { User } from '../models/User';
import { calculateAvailableSpendingBudget } from '../calculations/financialEngine';

export interface ProfileDetails {
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  financialProfile: {
    monthlyIncome: number;
    monthlySavingsTarget: number;
    availableSpendingBudget: number;
    currency: string;
    onboardingCompleted: boolean;
  };
}

export class ProfileService {
  static async getProfile(userId: string): Promise<ProfileDetails> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    let profile = await FinancialProfile.findOne({ userId });
    if (!profile) {
      profile = await FinancialProfile.create({
        userId,
        monthlyIncome: 0,
        monthlySavingsTarget: 0,
        availableSpendingBudget: 0,
        currency: '₹',
        onboardingCompleted: false
      });
    }

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName
      },
      financialProfile: {
        monthlyIncome: profile.monthlyIncome,
        monthlySavingsTarget: profile.monthlySavingsTarget,
        availableSpendingBudget: profile.availableSpendingBudget,
        currency: profile.currency,
        onboardingCompleted: profile.onboardingCompleted
      }
    };
  }

  static async updateProfile(
    userId: string,
    data: {
      monthlyIncome: number;
      monthlySavingsTarget: number;
      currency?: string;
      fullName?: string;
    }
  ): Promise<ProfileDetails> {
    if (data.fullName) {
      await User.findByIdAndUpdate(userId, { fullName: data.fullName });
    }

    const availableBudget = calculateAvailableSpendingBudget(
      data.monthlyIncome,
      data.monthlySavingsTarget
    );

    const profile = await FinancialProfile.findOneAndUpdate(
      { userId },
      {
        monthlyIncome: data.monthlyIncome,
        monthlySavingsTarget: data.monthlySavingsTarget,
        availableSpendingBudget: availableBudget,
        currency: data.currency || '₹',
        onboardingCompleted: true
      },
      { new: true, upsert: true }
    );

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found. Please log in again.');
    }

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName
      },
      financialProfile: {
        monthlyIncome: profile.monthlyIncome,
        monthlySavingsTarget: profile.monthlySavingsTarget,
        availableSpendingBudget: profile.availableSpendingBudget,
        currency: profile.currency,
        onboardingCompleted: profile.onboardingCompleted
      }
    };
  }
}
