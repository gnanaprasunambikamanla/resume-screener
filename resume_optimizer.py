import instructor
import os
import json
import logging
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data model for resume optimization request
class ResumeOptimizationRequest(BaseModel):
    summary: str = Field(..., description="The summary of the resume to optimize")
    missing_skills: list[str] = Field(default_factory=list, description="Important missing skills.")
    content_gaps: list[str] = Field(default_factory=list, description="Missing or weak experience/projects.")
    formatting_tips: list[str] = Field(default_factory=list, description="Suggestions to improve clarity and formatting.")
    customization_tips: list[str] = Field(default_factory=list, description="Suggestions to tailor the resume for this specific job.")
    priority_actions: list[str] = Field(default_factory=list, description="Top 3 most important actions to take immediately.")

class ResumeOptimizer:
    def __init__(self, api_key: str = "", model: str = "llama-3.3-70b-versatile"):
        groq_client = Groq(api_key=api_key or os.getenv("GROQ_API_KEY"))
        self.client = instructor.from_groq(groq_client, mode=instructor.Mode.JSON)
        self.model = model
        logger.info(f"ResumeOptimizer initialized with model {model}")

    def generate_suggestions(self, parsed_resume: dict, job_title: str, job_description: str, screening_result: dict) -> ResumeOptimizationRequest:
        """Generate LLM-based optimization suggestions for the resume."""
        system_prompt = """
        You are an expert career coach and technical recruiter.
        Analyze the candidate's resume in relation to the job description and the screening evaluation results.
        Provide actionable, specific, and professional suggestions to optimize the resume for this job.
        Be constructive and concise — focus on what to improve.
        """

        user_prompt = f"""
        JOB TITLE: {job_title}

        JOB DESCRIPTION:
        {job_description}

        PARSED RESUME:
        {parsed_resume}

        SCREENING EVALUATION RESULT:
        {screening_result}

        Provide suggestions under each of the following categories:
        1. Missing or weak skills.
        2. Content gaps (projects, achievements, experience).
        3. Formatting and structure improvements.
        4. Customization tips for this specific job.
        5. Top 3 priority actions to improve the resume immediately.
        """

        try:
            result = self.client.chat.completions.create(
                model=self.model,
                temperature=0.5,
                response_model=ResumeOptimizationRequest,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_retries=2,
            )

            logger.info("✅ Resume optimization suggestions generated successfully")
            return result

        except Exception as e:
            logger.error(f"Error generating resume optimization suggestions: {e}")
            raise

    def export_optimization_to_json(
        self,
        optimization_result: ResumeOptimizationRequest,
        file_path: str = ""
    ) -> str:
        """Export optimization result to JSON format."""
        json_data = optimization_result.model_dump(exclude_none=True)
        json_string = json.dumps(json_data, indent=2, default=str)
        
        if file_path:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(json_string)
            logger.info(f"Optimisation result exported to: {file_path}")
        
        return json_string