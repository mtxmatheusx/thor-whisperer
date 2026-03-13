import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [thorEndpoint, setThorEndpoint] = useState(
    import.meta.env.VITE_THOR_AI_ENDPOINT || 'http://187.77.232.76:8000'
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" /> Configurações
        </h1>
        <p className="text-muted-foreground">Configurações do sistema SDR.ai</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conta</CardTitle>
          <CardDescription>Informações da sua conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Email</Label>
            <p className="text-sm">{user?.email}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">ID</Label>
            <p className="text-sm font-mono text-xs">{user?.id}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thor AI</CardTitle>
          <CardDescription>Configurações da integração com Thor AI</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Endpoint Thor AI</Label>
            <Input value={thorEndpoint} onChange={e => setThorEndpoint(e.target.value)} placeholder="http://..." />
          </div>
          <p className="text-xs text-muted-foreground">
            Configure via variável de ambiente VITE_THOR_AI_ENDPOINT para persistir.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
