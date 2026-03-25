import { FolderKanban, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CommunityProjectsProps {
  canManage: boolean;
}

const CommunityProjects = ({ canManage }: CommunityProjectsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5" />
          Community Projects
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 pb-12 text-center">
        <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="font-medium text-foreground mb-2">No shared projects yet</p>
        <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
          This section is reserved for community-specific project collaboration and showcase items.
        </p>
        {canManage && (
          <Button className="gradient-bg text-primary-foreground hover:opacity-90">
            <Upload className="h-4 w-4 mr-2" />
            Add First Project
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default CommunityProjects;
