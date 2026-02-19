export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
    status: 'pending' | 'approved' | 'rejected' | null; 
  user_type: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface JobSeeker {
  id: string;
  photo_url: string | null;
  mobile: string | null;
  aadhar_url: string | null;
  pan_url: string | null;
  job_type: string | null;
  monthly_charges: number | null;
  created_at: string | null;
  profiles?: Profile;
}

export interface UserPost {
  id: string;
  user_id: string;
  job_title: string;
  job_category: string;
  job_type: string;
  location: string;
  salary: string;
  experience: string;
  job_description: string;
  required_skills: string;
  number_of_openings: number;
  last_apply_date: string;
  status: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export interface LoginLog {
  id: string;
  user_id: string;
  login_time: string;
  profiles: {
    name: string | null;
    email: string | null;
    user_type: string | null;
  };
}

export interface SignupLog {
  id: string;
  user_id: string;
  created_at: string;  // This is the signup time
  profiles: {
    name: string | null;
    email: string | null;
    user_type: string | null;
  };
}