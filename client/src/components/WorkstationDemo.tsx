import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, FileText, Youtube, Calendar, Monitor, Search } from 'lucide-react';

interface WorkstationDemoProps {
  onDemoAction: (action: string) => void;
}

export default function WorkstationDemo({ onDemoAction }: WorkstationDemoProps) {
  const demoActions = [
    {
      id: 'ai-thinking',
      name: 'Show AI Thinking',
      icon: Brain,
      description: 'Display AI processing thoughts',
      action: () => {
        // Simulate AI workstation thinking
        window.dispatchEvent(new CustomEvent('workstation:thinking', {
          detail: { message: 'Analyzing user request patterns...' }
        }));
        
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('workstation:open', {
            detail: { 
              tool: 'diary', 
              thinking: 'Processing insights from conversation history',
              payload: { 
                reflection: 'User frequently requests task management features. Building comprehensive system with voice integration and calendar sync.'
              }
            }
          }));
        }, 1000);
      }
    },
    {
      id: 'create-doc',
      name: 'Create Document',
      icon: FileText,
      description: 'Generate a document in workstation',
      action: () => {
        window.dispatchEvent(new CustomEvent('workstation:open', {
          detail: { 
            tool: 'docs',
            thinking: 'Creating project proposal document',
            payload: { 
              title: 'SMS Integration Proposal',
              content: 'SMS Integration for Emergent Intelligence\n\nOverview:\nImplement Twilio SMS functionality to enable:\n- Task creation via text messages\n- Proactive AI reminders\n- Link sharing for tutorials and resources\n- Bidirectional communication\n\nTechnical Requirements:\n- Twilio API integration\n- Message parsing and task extraction\n- Scheduled message system\n- URL shortening for links'
            }
          }
        }));
      }
    },
    {
      id: 'show-video',
      name: 'Display YouTube Video',
      icon: Youtube,
      description: 'Load instructional video',
      action: () => {
        window.dispatchEvent(new CustomEvent('workstation:open', {
          detail: { 
            tool: 'media',
            thinking: 'Loading tutorial video for user reference',
            payload: { 
              youtubeId: 'dQw4w9WgXcQ' // Rick Roll for demo - replace with actual tutorial
            }
          }
        }));
      }
    },
    {
      id: 'research-mode',
      name: 'Research Session',
      icon: Search,
      description: 'Open research scratchpad',
      action: () => {
        window.dispatchEvent(new CustomEvent('workstation:open', {
          detail: { 
            tool: 'research',
            thinking: 'Compiling research on SMS automation',
            payload: { 
              notes: 'SMS Integration Research\n\nKey Findings:\n• Twilio provides reliable SMS API with global coverage\n• Average SMS open rate: 98% vs Email: 20%\n• Response time: SMS 90 seconds vs Email 90+ minutes\n• Cost: $0.0075 per SMS in US\n\nImplementation Strategy:\n• Use webhooks for incoming messages\n• NLP processing for task extraction\n• Scheduled messaging for reminders\n• Integration with existing knowledge base\n\nNext Steps:\n• Set up Twilio account\n• Configure webhook endpoints\n• Implement message parsing logic'
            }
          }
        }));
      }
    },
    {
      id: 'browse-docs',
      name: 'Load Documentation',
      icon: Monitor,
      description: 'Open Twilio docs in browser panel',
      action: () => {
        window.dispatchEvent(new CustomEvent('workstation:open', {
          detail: { 
            tool: 'browser',
            thinking: 'Loading Twilio SMS documentation',
            payload: { 
              url: 'https://www.twilio.com/docs/sms/quickstart'
            }
          }
        }));
      }
    }
  ];

  return (
    <div className="bg-slate-800/20 border border-amber-500/20 rounded-lg p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
        <h3 className="text-sm font-bold text-amber-200">AI Workstation Demo</h3>
        <Badge variant="secondary" className="bg-blue-900/30 text-blue-300 text-xs">
          Live Preview
        </Badge>
      </div>
      
      <p className="text-xs text-amber-300/70 mb-4">
        See how ChatGPT-5 can autonomously control the workstation above to show its thinking and work:
      </p>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {demoActions.map((demo) => {
          const Icon = demo.icon;
          return (
            <Button
              key={demo.id}
              variant="ghost"
              size="sm"
              onClick={demo.action}
              className="flex flex-col items-center gap-1 h-auto p-3 text-amber-300/80 hover:text-amber-200 hover:bg-amber-900/20 border border-amber-500/20"
              title={demo.description}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs text-center leading-tight">{demo.name}</span>
            </Button>
          );
        })}
      </div>
      
      <p className="text-xs text-amber-400/60 mt-3 text-center">
        In production, ChatGPT-5 will control this automatically based on conversation context
      </p>
    </div>
  );
}