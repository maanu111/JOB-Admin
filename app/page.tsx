"use client";

import { useState } from "react";
import Image from "next/image";

// Mock data for demonstration
const mockJobseekers = [
  { id: 1, name: "John Doe", email: "john@example.com", appliedJobs: 5, status: "Active" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", appliedJobs: 3, status: "Active" },
  { id: 3, name: "Mike Johnson", email: "mike@example.com", appliedJobs: 2, status: "Inactive" },
  { id: 4, name: "Sarah Williams", email: "sarah@example.com", appliedJobs: 7, status: "Active" },
  { id: 5, name: "Tom Brown", email: "tom@example.com", appliedJobs: 1, status: "Active" },
];

const mockUsers = [
  { id: 1, name: "Admin User", email: "admin@example.com", role: "Admin", status: "Active" },
  { id: 2, name: "Sarah Wilson", email: "sarah@example.com", role: "Employer", status: "Active" },
  { id: 3, name: "Mike Chen", email: "mike@example.com", role: "Employer", status: "Inactive" },
  { id: 4, name: "Emily Davis", email: "emily@example.com", role: "Moderator", status: "Active" },
  { id: 5, name: "Alex Turner", email: "alex@example.com", role: "Employer", status: "Active" },
];

type ViewType = "jobseekers" | "users";

export default function AdminDashboard() {
  const [activeView, setActiveView] = useState<ViewType>("jobseekers");

  return (
    <div className="flex min-h-screen bg-white dark:bg-black">
      {/* Minimal Sidebar - Compact */}
      <aside className="fixed left-0 top-0 h-full w-48 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-black">
        <div className="flex h-full flex-col">
          {/* Logo - Compact */}
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <Image
              className="dark:invert"
              src="/next.svg"
              alt="Logo"
              width={80}
              height={16}
              priority
            />
          </div>

          {/* Single Navigation Item - Compact */}
          <nav className="flex-1 p-2">
            <div className="flex w-full items-center gap-2 rounded px-3 py-2 text-xs font-medium text-black dark:text-white bg-gray-100 dark:bg-gray-900">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              Users
            </div>
          </nav>

          {/* Logout at Bottom - Compact */}
          <div className="border-t border-gray-200 p-2 dark:border-gray-800">
            <button className="flex w-full items-center gap-2 rounded px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-900">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-48 flex-1">
        {/* Simple Header - Compact */}
        <header className="border-b border-gray-200 bg-white px-6 py-2 dark:border-gray-800 dark:bg-black">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-medium text-black dark:text-white">
              Dashboard
            </h1>
            <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-800"></div>
          </div>
        </header>

        {/* Content Area - Compact Padding */}
        <div className="p-4">
          {/* Top Tabs - Compact */}
          <div className="mb-4 flex gap-0.5 rounded bg-gray-100 p-0.5 dark:bg-gray-900">
            <button
              onClick={() => setActiveView("jobseekers")}
              className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-all ${
                activeView === "jobseekers"
                  ? "bg-white text-black dark:bg-black dark:text-white"
                  : "text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              Jobseekers
            </button>
            <button
              onClick={() => setActiveView("users")}
              className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-all ${
                activeView === "users"
                  ? "bg-white text-black dark:bg-black dark:text-white"
                  : "text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              Users
            </button>
          </div>

          {/* Stats - Minimal Cards - Compact */}
          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="bg-white p-3 dark:bg-black">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {activeView === "jobseekers" ? "Total Jobseekers" : "Total Users"}
              </p>
              <p className="mt-1 text-xl font-light text-black dark:text-white">
                {activeView === "jobseekers" ? "156" : "89"}
              </p>
            </div>
            <div className="bg-white p-3 dark:bg-black">
              <p className="text-xs text-gray-600 dark:text-gray-400">Active</p>
              <p className="mt-1 text-xl font-light text-black dark:text-white">
                {activeView === "jobseekers" ? "142" : "76"}
              </p>
            </div>
            <div className="bg-white p-3 dark:bg-black">
              <p className="text-xs text-gray-600 dark:text-gray-400">Inactive</p>
              <p className="mt-1 text-xl font-light text-black dark:text-white">
                {activeView === "jobseekers" ? "14" : "13"}
              </p>
            </div>
          </div>

          {/* Simple Search - Compact */}
          <div className="mb-4">
            <input
              type="text"
              placeholder={`Search ${activeView}...`}
              className="w-full bg-white px-3 py-1.5 text-xs text-black placeholder-gray-400 focus:outline-none dark:bg-black dark:text-white"
            />
          </div>

          {/* Minimal Tables - Compact */}
          <div className="bg-white dark:bg-black">
            {activeView === "jobseekers" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Name</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Email</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Jobs</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {mockJobseekers.map((jobseeker) => (
                      <tr key={jobseeker.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                        <td className="px-3 py-2 text-xs text-black dark:text-white">{jobseeker.name}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">{jobseeker.email}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">{jobseeker.appliedJobs}</td>
                        <td className="px-3 py-2 text-xs">
                          <span className={`${
                            jobseeker.status === "Active" 
                              ? "text-black dark:text-white"
                              : "text-gray-400 dark:text-gray-600"
                          }`}>
                            {jobseeker.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <button className="text-black underline hover:no-underline dark:text-white">
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Name</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Email</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Role</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {mockUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                        <td className="px-3 py-2 text-xs text-black dark:text-white">{user.name}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">{user.email}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">{user.role}</td>
                        <td className="px-3 py-2 text-xs">
                          <span className={`${
                            user.status === "Active" 
                              ? "text-black dark:text-white"
                              : "text-gray-400 dark:text-gray-600"
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <button className="text-black underline hover:no-underline dark:text-white">
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}