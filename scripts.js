// Application State
let currentResults = null;
let selectedFile = null;

// DOM Elements
const uploadSection = document.getElementById("upload-section");
const resultsSection = document.getElementById("results-section");
const loadingOverlay = document.getElementById("loading-overlay");
const screeningForm = document.getElementById("screening-form");
const fileInput = document.getElementById("file-input");
const uploadArea = document.getElementById("upload-area");
const fileInfo = document.getElementById("file-info");
const advancedToggle = document.getElementById("advanced-toggle");
const advancedOptions = document.getElementById("advanced-options");
const toggleIcon = document.getElementById("toggle-icon");
const errorMessage = document.getElementById("error-message");
const backButton = document.getElementById("back-button");

// Initialize Application
document.addEventListener("DOMContentLoaded", function () {
  initializeEventListeners();
});

function initializeEventListeners() {
  // File upload handling
  fileInput.addEventListener("change", handleFileSelect);
  uploadArea.addEventListener("click", () => fileInput.click());
  uploadArea.addEventListener("dragover", handleDragOver);
  uploadArea.addEventListener("dragleave", handleDragLeave);
  uploadArea.addEventListener("drop", handleFileDrop);

  // Form submission
  screeningForm.addEventListener("submit", handleFormSubmit);

  // Advanced options toggle
  advancedToggle.addEventListener("click", toggleAdvancedOptions);

  // Back button
  backButton.addEventListener("click", showUploadSection);
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    validateAndSetFile(file);
  }
}

function handleDragOver(event) {
  event.preventDefault();
  uploadArea.classList.add("dragover");
}

function handleDragLeave(event) {
  event.preventDefault();
  uploadArea.classList.remove("dragover");
}

function handleFileDrop(event) {
  event.preventDefault();
  uploadArea.classList.remove("dragover");

  const file = event.dataTransfer.files[0];
  if (file) {
    validateAndSetFile(file);
    fileInput.files = event.dataTransfer.files;
  }
}

function validateAndSetFile(file) {
  const allowedTypes = [".pdf", ".docx", ".doc"];
  const fileName = file.name.toLowerCase();
  const isValidType = allowedTypes.some((type) => fileName.endsWith(type));

  if (!isValidType) {
    showError("Please select a PDF or DOCX file.");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    // 10MB limit
    showError("File size must be less than 10MB.");
    return;
  }

  selectedFile = file;
  showFileInfo(file);
  hideError();
}

function showFileInfo(file) {
  fileInfo.innerHTML = `
                <span>✅ Selected: ${file.name}</span>
                <span style="margin-left: var(--space-16); color: var(--color-text-secondary);">(${(
                  file.size /
                  1024 /
                  1024
                ).toFixed(2)} MB)</span>
            `;
  fileInfo.style.display = "block";
}

function toggleAdvancedOptions() {
  const isVisible = advancedOptions.classList.contains("show");

  if (isVisible) {
    advancedOptions.classList.remove("show");
    toggleIcon.textContent = "▼";
  } else {
    advancedOptions.classList.add("show");
    toggleIcon.textContent = "▲";
  }
}

async function handleFormSubmit(event) {
  event.preventDefault();

  if (!selectedFile) {
    showError("Please select a resume file.");
    return;
  }

  const jobTitle = document.getElementById("job-title").value.trim();
  const jobDescription = document
    .getElementById("job-description")
    .value.trim();

  if (!jobTitle || !jobDescription) {
    showError("Please fill in all required fields.");
    return;
  }

  const customWeights = document.getElementById("custom-weights").value.trim();

  // Validate custom weights if provided
  if (customWeights) {
    try {
      JSON.parse(customWeights);
    } catch (e) {
      showError("Invalid JSON format in custom weights.");
      return;
    }
  }

  // Show loading
  showLoading();
  hideError();

  try {
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("job_title", jobTitle);
    formData.append("job_description", jobDescription);

    if (customWeights) {
      formData.append("weights", customWeights);
    }

    // Make API call to Flask backend with extended timeout (5 minutes)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout

    let response;
    try {
      response = await fetch("http://localhost:5000/api/screen", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        throw new Error(
          "Request timeout. The processing is taking longer than expected. Please try again."
        );
      }
      throw new Error(
        "Network error. Please ensure the Flask server is running on localhost:5000."
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      currentResults = result.data;
      currentResults.job_title = jobTitle;
      showResults();
    } else {
      showError(
        result.error || "An error occurred while processing the resume."
      );
    }
  } catch (error) {
    console.error("Error:", error);
    showError(
      error.message || "An unexpected error occurred. Please try again."
    );
  } finally {
    hideLoading();
  }
}

function getMockResults() {
  // Using the provided sample data
  return {
    parsed: {
      full_name: "Soham Jyoti Mondal",
      email: "sohamjyotimondal@gmail.com",
      phone: "7074041978",
      location: "Chennai, TN",
      external_links: {
        linkedin: "https://www.linkedin.com/in/sohamjyotimondal/",
        github: "https://github.com/sohamjyotimondal/",
        portfolio: "https://sohamjyotimondal.me",
      },
      work_experience: [
        {
          company: "Pythian Technologies Pvt Ltd",
          position: "GenAI Intern",
          duration: "May 2024 – August 2024",
          description:
            "Designed a maritime risk‑assessment chatbot with GraphQL integration for natural‑language queries and built an agentic HR chatbot using CrewAI, RAG, and dynamic SQL generation to automate data reporting and visualization.",
        },
        {
          company: "Samsung R&D Institute Bangalore",
          position: "Advanced Research Intern",
          duration: "July 2024 – Feb 2025",
          description:
            "Implemented audio preprocessing and augmentation pipelines for body‑sound analysis and benchmarked a Constant Ensemble Distillation model on specialized audio classification tasks.",
        },
      ],
      education: [
        {
          institution: "Vellore Institute of Technology, Chennai",
          degree:
            "B. Tech, Computer Science Engineering with specialization in AI & ML",
          marks: "CGPA 9.07/10",
          field_of_study: "Computer Science Engineering (AI & ML)",
          graduation_year: "2026",
        },
      ],
      projects: [
        {
          name: "Smaller Segmentation Model Distilled from Mixture of Experts",
          description:
            "Created a compact medical image segmentation model via knowledge distillation from a Mixture‑of‑Experts UNETR, cutting inference time by 46% and model size by 75% with only a 2% Dice score drop.",
          skills: [
            "Python",
            "PyTorch",
            "Medical Imaging",
            "Knowledge Distillation",
            "UNETR",
            "Mixture of Experts",
          ],
        },
        {
          name: "Custom Reinforcement Learning for Unity Game",
          description:
            "Implemented an RL‑based zombie spawner in Unity that adapts spawn rates using a deep neural network and custom reward function to keep gameplay balanced.",
          skills: [
            "Python",
            "Unity",
            "Reinforcement Learning",
            "Deep Neural Networks",
          ],
        },
        {
          name: "Cryptographic Encryption Using Invertible Neural Networks",
          description:
            "Built a cryptographic system with invertible neural networks and normalizing flows, achieving 30% lower computational overhead compared to deeper networks.",
          skills: [
            "Python",
            "Invertible Neural Networks",
            "Normalizing Flows",
            "Cryptography",
          ],
        },
      ],
      skills: [
        "Data Analysis",
        "Machine Learning",
        "Computer Vision",
        "NLP",
        "Reinforcement Learning",
        "Python",
        "Java",
        "JavaScript",
        "TensorFlow",
        "PyTorch",
        "Unity",
      ],
      publications: [
        "SMS Spam Detection and Filtering of Transliterated Messages – Intelligent Computing and Control for Engineering and Business Systems (ICCEBS) (2023)",
        "The Evolution of Logistics: Role of AI in Enhanced Operational Efficiency and Risk Mitigation – Redefining Commerce and Management: New Paradigms for the Digital Age (ISBN: 978-81-19368-52-5)",
      ],
    },
    screened: {
      skill_match: {
        score: 8.5,
        matched_skills: [
          "Python",
          "Java",
          "JavaScript",
          "CI/CD",
          "Cloud platforms (indirectly through projects)",
        ],
        missing_skills: ["Direct experience with AWS, GCP, or Azure"],
        additional_skills: [
          "Data Analysis",
          "Machine Learning",
          "Computer Vision",
          "NLP",
          "Reinforcement Learning",
        ],
        reasoning:
          "The candidate has a strong skill set with proficiency in multiple programming languages, including Python, Java, and JavaScript. They also have experience with CI/CD pipelines, which is a requirement for the job. However, they lack direct experience with cloud platforms like AWS, GCP, or Azure, which is a critical skill for the position.",
      },
      experience_match: {
        score: 6.5,
        relevant_experience: [
          "GenAI Intern at Pythian Technologies Pvt Ltd",
          "Advanced Research Intern at Samsung R&D Institute Bangalore",
        ],
        years_of_experience: "1 year",
        seniority_match: "Under-qualified",
        reasoning:
          "The candidate has some relevant experience through internships, but it falls short of the 5+ years of software development experience required for the position. Their experience is mostly in research and development, which may not directly translate to the senior software engineer role.",
      },
      education_match: {
        score: 9.0,
        meets_requirements: true,
        relevant_degrees: [
          "B. Tech, Computer Science Engineering with specialization in AI & ML",
        ],
        reasoning:
          "The candidate has a strong educational background with a Bachelor's degree in Computer Science Engineering and a specialization in AI & ML, which meets the job requirements. Their high CGPA score also demonstrates academic excellence.",
      },
      project_match: {
        score: 9.0,
        relevant_projects: [
          "Smaller Segmentation Model Distilled from Mixture of Experts",
          "Custom Reinforcement Learning for Unity Game",
          "Cryptographic Encryption Using Invertible Neural Networks",
        ],
        key_technologies: [
          "Python",
          "PyTorch",
          "Medical Imaging",
          "Knowledge Distillation",
          "Unity",
          "Reinforcement Learning",
        ],
        reasoning:
          "The candidate has an impressive portfolio of projects that demonstrate their technical skills and innovation. These projects showcase their ability to work with various technologies, including Python, PyTorch, and Unity, and their experience with machine learning, computer vision, and reinforcement learning.",
      },
      cultural_fit: {
        score: 7.0,
        indicators: [
          "Research experience",
          "Publication history",
          "Strong educational background",
        ],
        reasoning:
          "The candidate appears to have a strong cultural fit due to their research experience, publication history, and academic achievements. However, there is limited information about their communication skills, problem-solving abilities, and teamwork experience, which are essential for the senior software engineer role.",
      },
      overall_score: 7.83,
      recommendation: "Potential Match",
      summary:
        "The candidate has a strong technical skill set, impressive project portfolio, and excellent educational background. However, they lack direct experience with cloud platforms and fall short of the required 5+ years of software development experience. With some training and guidance, they could potentially grow into the senior software engineer role.",
      strengths: [
        "Strong technical skills",
        "Impressive project portfolio",
        "Excellent educational background",
      ],
      concerns: [
        "Lack of direct experience with cloud platforms",
        "Limited experience in software development",
        "Uncertainty about communication and teamwork skills",
      ],
    },
  };
}

function showResults() {
  hideLoading();
  uploadSection.style.display = "none";
  resultsSection.style.display = "block";
  resultsSection.classList.add("show", "fade-in");

  renderResults();
}

function showUploadSection() {
  resultsSection.style.display = "none";
  uploadSection.style.display = "block";

  // Reset form
  screeningForm.reset();
  selectedFile = null;
  fileInfo.style.display = "none";
  hideError();
}

function renderResults() {
  if (!currentResults) return;

  const { parsed, screened } = currentResults;

  document.getElementById("job-title-display").textContent =
  `Job Applied: ${currentResults.job_title}`;
  // Update overall score
  updateOverallScore(screened.overall_score);
  updateRecommendationBadge(screened.recommendation);
  document.getElementById("summary-text").textContent = screened.summary;

  // Render resume overview
  renderResumeOverview(parsed);

  // Render screening breakdown
  renderScreeningBreakdown(screened);

  // Render experience and projects
  renderExperienceProjects(parsed);

  // Render analysis summary
  renderAnalysisSummary(screened);
}

function updateOverallScore(score) {
  const scoreText = document.getElementById("overall-score-text");
  const scoreProgress = document.getElementById("score-progress");

  scoreText.textContent = score.toFixed(1);

  // Animate the circular progress
  const circumference = 2 * Math.PI * 54; // radius is 54
  const offset = circumference - (score / 10) * circumference;

  setTimeout(() => {
    scoreProgress.style.strokeDashoffset = offset;
    scoreProgress.style.transition = "stroke-dashoffset 1.5s ease-in-out";
  }, 500);
}

function updateRecommendationBadge(recommendation) {
  const badge = document.getElementById("recommendation-badge");
  badge.textContent = recommendation;

  // Add appropriate class based on recommendation
  badge.className = "recommendation-badge";
  if (recommendation.includes("Strong")) {
    badge.classList.add("recommendation-strong");
  } else if (recommendation.includes("Potential")) {
    badge.classList.add("recommendation-potential");
  } else {
    badge.classList.add("recommendation-weak");
  }
}

function renderResumeOverview(parsed) {
  const container = document.getElementById("resume-overview");

  container.innerHTML = `
                <div style="margin-bottom: var(--space-16);">
                    <h3>${parsed.full_name}</h3>
                    <p style="color: var(--color-text-secondary); margin: var(--space-4) 0;">${
                      parsed.email
                    } • ${parsed.phone}</p>
                    <p style="color: var(--color-text-secondary); margin: var(--space-4) 0;">📍 ${
                      parsed.location
                    }</p>
                </div>
                
                <div style="margin-bottom: var(--space-16);">
                    <h4 style="margin-bottom: var(--space-8);">🎓 Education</h4>
                    <div>
                        <strong>${parsed.education[0].degree}</strong><br>
                        <span style="color: var(--color-text-secondary);">${
                          parsed.education[0].institution
                        }</span><br>
                        <span style="color: var(--color-success); font-size: var(--font-size-sm);">${
                          parsed.education[0].marks
                        }</span>
                    </div>
                </div>
                
                <div style="margin-bottom: var(--space-16);">
                    <h4 style="margin-bottom: var(--space-12);">🛠️ Skills</h4>
                    <div class="skills-grid">
                        ${parsed.skills
                          .map(
                            (skill) => `<span class="skill-tag">${skill}</span>`
                          )
                          .join("")}
                    </div>
                </div>
                
                <div>
                    <h4 style="margin-bottom: var(--space-8);">🔗 Links</h4>
                    <div>
                        <a href="${
                          parsed.external_links.linkedin
                        }" target="_blank" style="display: block; margin-bottom: var(--space-4);">LinkedIn Profile</a>
                        <a href="${
                          parsed.external_links.github
                        }" target="_blank" style="display: block; margin-bottom: var(--space-4);">GitHub Profile</a>
                        <a href="${
                          parsed.external_links.portfolio
                        }" target="_blank" style="display: block;">Portfolio</a>
                    </div>
                </div>
            `;
}

function renderScreeningBreakdown(screened) {
  const container = document.getElementById("screening-breakdown");

  const categories = [
    {
      name: "Skills Match",
      score: screened.skill_match.score,
      key: "skill_match",
    },
    {
      name: "Experience Match",
      score: screened.experience_match.score,
      key: "experience_match",
    },
    {
      name: "Education Match",
      score: screened.education_match.score,
      key: "education_match",
    },
    {
      name: "Project Match",
      score: screened.project_match.score,
      key: "project_match",
    },
    {
      name: "Cultural Fit",
      score: screened.cultural_fit.score,
      key: "cultural_fit",
    },
  ];

  container.innerHTML = categories
    .map((category) => {
      const scoreClass =
        category.score >= 8
          ? "score-high"
          : category.score >= 6
          ? "score-medium"
          : "score-low";

      return `
                    <div style="margin-bottom: var(--space-16);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-8);">
                            <span style="font-weight: var(--font-weight-medium);">${
                              category.name
                            }</span>
                            <span style="font-weight: var(--font-weight-bold);">${category.score.toFixed(
                              1
                            )}/10</span>
                        </div>
                        <div class="score-bar">
                            <div class="score-fill ${scoreClass}" style="width: ${
        category.score * 10
      }%;"></div>
                        </div>
                        <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: var(--space-8);">
                            ${screened[category.key].reasoning}
                        </p>
                    </div>
                `;
    })
    .join("");
}

function renderExperienceProjects(parsed) {
  const container = document.getElementById("experience-projects");

  container.innerHTML = `
                <div style="margin-bottom: var(--space-24);">
                    <h4 style="margin-bottom: var(--space-16);">💼 Work Experience</h4>
                    ${parsed.work_experience
                      .map(
                        (exp) => `
                        <div class="experience-item">
                            <div class="experience-header">
                                <div class="experience-company">${exp.company}</div>
                                <div class="experience-position">${exp.position}</div>
                                <div class="experience-duration">${exp.duration}</div>
                            </div>
                            <p style="color: var(--color-text-secondary); margin-top: var(--space-8);">${exp.description}</p>
                        </div>
                    `
                      )
                      .join("")}
                </div>
                
                <div>
                    <h4 style="margin-bottom: var(--space-16);">🚀 Key Projects</h4>
                    <div class="projects-grid">
                        ${parsed.projects
                          .map(
                            (project) => `
                            <div class="project-card">
                                <div class="project-name">${project.name}</div>
                                <div class="project-description">${
                                  project.description
                                }</div>
                                <div class="skills-grid">
                                    ${project.skills
                                      .map(
                                        (skill) =>
                                          `<span class="skill-tag">${skill}</span>`
                                      )
                                      .join("")}
                                </div>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                </div>
            `;
}

function renderAnalysisSummary(screened) {
  const container = document.getElementById("analysis-summary");

  container.innerHTML = `
                <div class="list-section">
                    <h4>💪 Strengths</h4>
                    <ul>
                        ${screened.strengths
                          .map(
                            (strength) => `
                            <li class="strength-item">✅ ${strength}</li>
                        `
                          )
                          .join("")}
                    </ul>
                </div>
                
                <div class="list-section">
                    <h4>⚠️ Areas of Concern</h4>
                    <ul>
                        ${screened.concerns
                          .map(
                            (concern) => `
                            <li class="concern-item">⚠️ ${concern}</li>
                        `
                          )
                          .join("")}
                    </ul>
                </div>
                
                <div class="list-section">
                    <h4>🎯 Skills Analysis</h4>
                    <div style="margin-bottom: var(--space-16);">
                        <h5 style="color: var(--color-success); margin-bottom: var(--space-8);">Matched Skills</h5>
                        <div class="skills-grid">
                            ${screened.skill_match.matched_skills
                              .map(
                                (skill) => `
                                <span class="skill-tag skill-matched">${skill}</span>
                            `
                              )
                              .join("")}
                        </div>
                    </div>
                    
                    <div style="margin-bottom: var(--space-16);">
                        <h5 style="color: var(--color-error); margin-bottom: var(--space-8);">Missing Skills</h5>
                        <div class="skills-grid">
                            ${screened.skill_match.missing_skills
                              .map(
                                (skill) => `
                                <span class="skill-tag skill-missing">${skill}</span>
                            `
                              )
                              .join("")}
                        </div>
                    </div>
                    
                    <div>
                        <h5 style="color: var(--color-info); margin-bottom: var(--space-8);">Additional Skills</h5>
                        <div class="skills-grid">
                            ${screened.skill_match.additional_skills
                              .map(
                                (skill) => `
                                <span class="skill-tag">${skill}</span>
                            `
                              )
                              .join("")}
                        </div>
                    </div>
                </div>
            `;
}

function showLoading() {
  loadingOverlay.classList.add("show");
}

function hideLoading() {
  loadingOverlay.classList.remove("show");
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
}

function hideError() {
  errorMessage.style.display = "none";
}
