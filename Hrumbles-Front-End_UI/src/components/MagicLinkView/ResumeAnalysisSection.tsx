// components/ResumeAnalysisSection.tsx
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ResumeAnalysis } from "@/components/MagicLinkView/types";

interface ResumeAnalysisSectionProps {
  resumeAnalysis: ResumeAnalysis;
}

export const ResumeAnalysisSection: React.FC<ResumeAnalysisSectionProps> = ({
  resumeAnalysis,
}) => {

  console.log("resumeAnalysis", resumeAnalysis);
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Resume Analysis</h3>
      <Card className="border border-gray-200 bg-white shadow-sm w-full">
        <CardContent className="p-4">
          <p className="text-sm font-medium">
            Overall Score: {resumeAnalysis.overall_score}%
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {resumeAnalysis.summary}
          </p>
        </CardContent>
      </Card>
      <Card className="border border-gray-200 bg-white shadow-sm w-full">
        <CardContent className="p-4">
          <p className="text-sm font-medium">Top Skills</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {resumeAnalysis.top_skills.map((skill, index) => (
              <Badge
                key={index}
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                {skill}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="border border-gray-200 bg-white shadow-sm w-full">
        <CardContent className="p-4">
          <p className="text-sm font-medium">Missing or Weak Areas</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {resumeAnalysis.missing_or_weak_areas.map((area, index) => (
              <Badge
                key={index}
                variant="outline"
                className="bg-red-50 text-red-700 border-red-200"
              >
                {area}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="border border-gray-200 bg-white shadow-sm w-full">
        <CardContent className="p-4">
          <p className="text-sm font-medium">Development Gaps</p>
          <ul className="list-disc list-inside text-sm text-muted-foreground mt-2">
            {resumeAnalysis.development_gaps.map((gap, index) => (
              <li key={index}>{gap}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card className="border border-gray-200 bg-white shadow-sm w-full">
        <CardContent className="p-4">
          <p className="text-sm font-medium">Certifications</p>
          {resumeAnalysis.additional_certifications.length > 0 ? (
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2">
              {resumeAnalysis.additional_certifications.map((cert, index) => (
                <li key={index}>{cert}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">
              No certifications listed.
            </p>
          )}
        </CardContent>
      </Card>
      <Card className="border border-gray-200 bg-white shadow-sm w-full">
        <CardContent className="p-4">
          <p className="text-sm font-medium">Matched Skills</p>
          <div className="overflow-x-auto mt-2">
            <table className="min-w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Requirement
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Matched
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {resumeAnalysis.matched_skills.map((skill, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-4 py-3">{skill.requirement}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          skill.matched === "yes" &&
                            "bg-green-50 text-green-700 border-green-200",
                          skill.matched === "partial" &&
                            "bg-yellow-50 text-yellow-700 border-yellow-200",
                          skill.matched === "no" &&
                            "bg-red-50 text-red-700 border-red-200"
                        )}
                      >
                        {skill.matched}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{skill.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <Card className="border border-gray-200 bg-white shadow-sm w-full">
        <CardContent className="p-4">
          <p className="text-sm font-medium">Section-Wise Scoring</p>
          <div className="space-y-4 mt-2">
            {resumeAnalysis.section_wise_scoring.map((section, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                <p className="text-sm font-medium">
                  {section.section} (Weightage: {section.weightage}%)
                </p>
                <div className="overflow-x-auto mt-2">
                  <table className="min-w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                      <tr>
                        <th scope="col" className="px-4 py-3">
                          Submenu
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Score
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Weightage
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Weighted Score
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Remarks
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.submenus.map((submenu, subIndex) => (
                        <tr key={subIndex} className="border-b">
                          <td className="px-4 py-3">{submenu.submenu}</td>
                          <td className="px-4 py-3">{submenu.score}/10</td>
                          <td className="px-4 py-3">{submenu.weightage}%</td>
                          <td className="px-4 py-3">
  {typeof submenu.weighted_score === 'number' ? submenu.weighted_score.toFixed(1) : 'N/A'}
</td>
                          <td className="px-4 py-3">{submenu.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};