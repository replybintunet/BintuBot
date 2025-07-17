import { apiRequest } from "./queryClient";

export interface AuthUser {
  id: number;
  username: string;
}

export interface LoginResponse {
  success: boolean;
  user: AuthUser;
}

class AuthService {
  private currentUser: AuthUser | null = null;

  async login(accountCode: string): Promise<LoginResponse> {
    const response = await apiRequest('POST', '/api/auth/login', { accountCode });
    const data = await response.json();
    
    if (data.success) {
      this.currentUser = data.user;
      localStorage.setItem('currentUser', JSON.stringify(data.user));
    }
    
    return data;
  }

  logout(): void {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
    localStorage.clear(); // Clear all auth data
  }

  getCurrentUser(): AuthUser | null {
    if (this.currentUser) {
      return this.currentUser;
    }
    
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      this.currentUser = JSON.parse(stored);
    }
    
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }
}

export const authService = new AuthService();
