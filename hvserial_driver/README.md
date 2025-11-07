# Driver de Porta Serial Virtual Hyper-V

## Descrição

Este é um driver em modo kernel para Windows que virtualiza portas seriais (COM) para máquinas virtuais Hyper-V. O driver atua como intermediário entre o sistema operacional host e as portas seriais físicas, permitindo que VMs acessem portas seriais como se fossem locais.

## Características

### Funcionalidades Principais

- ✅ Virtualização de portas seriais COM
- ✅ Redirecionamento de porta serial para VMs Hyper-V
- ✅ Comunicação bidirecional entre VM e porta física
- ✅ Suporte a configurações padrão de porta serial:
  - Taxa de transmissão (baud rate): 300 a 115200 bps
  - Bits de dados: 5, 6, 7, 8
  - Paridade: None, Odd, Even, Mark, Space
  - Bits de parada: 1, 1.5, 2
  - Controle de fluxo: None, Hardware (RTS/CTS), Software (XON/XOFF)

### Recursos Técnicos

- 🔧 Implementado em C puro para Windows Kernel Mode
- 🔧 Baseado no Windows Driver Framework (WDF/KMDF)
- 🔧 Buffers circulares para dados seriais (4KB padrão)
- 🔧 Gerenciamento de estatísticas de transmissão/recepção
- 🔧 Suporte a múltiplas portas simultâneas (até 256)
- 🔧 Sincronização thread-safe com spinlocks

## Arquitetura do Driver

### Componentes

```
hvserial_driver/
├── hvserial_driver.h    # Definições, estruturas e protótipos
├── hvserial_driver.c    # Ponto de entrada e inicialização do driver
├── hvserial_ioctl.c     # Manipuladores de controle I/O (IOCTL)
├── hvserial_port.c      # Comunicação serial e gerenciamento de buffers
├── hvserial.inf         # Arquivo de instalação do driver
├── SOURCES              # Arquivo de compilação WDK
├── Makefile             # Makefile para compilação
└── README.md            # Este arquivo
```

### Estrutura de Dados Principais

#### DEVICE_CONTEXT
Contexto do dispositivo contendo:
- Configuração da porta serial
- Buffers de transmissão e recepção
- Estatísticas de uso
- Estado de vinculação à porta física

#### SERIAL_BUFFER
Buffer circular thread-safe para dados seriais:
- Gerenciamento automático de wraparound
- Proteção com spinlock
- Suporte a leitura/escrita assíncrona

## Pré-requisitos

### Para Compilação

1. **Windows Driver Kit (WDK)**
   - Versão recomendada: WDK 10 ou superior
   - Download: https://docs.microsoft.com/windows-hardware/drivers/download-the-wdk

2. **Visual Studio**
   - Visual Studio 2019 ou 2022
   - Componentes necessários:
     - Desenvolvimento em Desktop com C++
     - SDK do Windows
     - Ferramentas de compilação do WDK

3. **SDK do Windows**
   - Versão 10.0.19041.0 ou superior

### Para Instalação

1. **Windows 10/11** (64-bit recomendado)
2. **Hyper-V** instalado e habilitado
3. **Privilégios de Administrador**
4. **Modo de Teste do Driver** habilitado (para drivers não assinados)

## Compilação

### Método 1: Usando o WDK Build Environment

1. Abra o **Prompt de Comando do WDK**:
   - Menu Iniciar → Windows Kits → WDK → Build Environment

2. Navegue até o diretório do driver:
   ```cmd
   cd C:\caminho\para\hvserial_driver
   ```

3. Execute o comando de compilação:
   ```cmd
   build -ceZ
   ```

   Opções:
   - `-c` : Limpa compilação anterior
   - `-e` : Exibe erros detalhados
   - `-Z` : Não atualiza dependências

4. O driver compilado será gerado em:
   ```
   obj\<arquitetura>\<debug|release>\hvserial.sys
   ```

### Método 2: Usando Visual Studio

1. Abra o **Visual Studio**

2. Crie um novo projeto:
   - File → New → Project
   - Templates → Visual C++ → Windows Drivers → WDF
   - Kernel Mode Driver (KMDF)

3. Adicione os arquivos fonte ao projeto:
   - hvserial_driver.c
   - hvserial_ioctl.c
   - hvserial_port.c
   - hvserial_driver.h

4. Configure o projeto:
   - Project Properties → Driver Settings
   - Target OS Version: Windows 10/11
   - Target Platform: Desktop

5. Compile:
   - Build → Build Solution (Ctrl+Shift+B)

### Método 3: Usando o Makefile

```cmd
nmake clean
nmake build
```

## Instalação

### Passo 1: Habilitar Modo de Teste (para drivers não assinados)

Execute como Administrador:

```cmd
bcdedit /set testsigning on
```

Reinicie o computador.

### Passo 2: Copiar Arquivos do Driver

Copie o arquivo `hvserial.sys` compilado para:

```
C:\Windows\System32\drivers\
```

### Passo 3: Instalar o Driver

**Opção A: Usando pnputil**

```cmd
pnputil.exe -i -a hvserial.inf
```

**Opção B: Usando o Gerenciador de Dispositivos**

1. Abra o Gerenciador de Dispositivos
2. Action → Add legacy hardware
3. Next → Install the hardware that I manually select from a list
4. Next → Have Disk
5. Navegue até o arquivo `hvserial.inf`
6. Siga o assistente de instalação

### Passo 4: Verificar Instalação

No Gerenciador de Dispositivos, procure por:
- Ports (COM & LPT)
  - Porta Serial Virtual Hyper-V

## Uso

### Configuração de Porta via IOCTL

O driver expõe IOCTLs personalizados para controle:

#### IOCTL_HVSERIAL_GET_PORT_INFO
Obtém informações sobre a porta virtual.

```c
SERIAL_PORT_INFO portInfo;
DWORD bytesReturned;

DeviceIoControl(
    hDevice,
    IOCTL_HVSERIAL_GET_PORT_INFO,
    NULL,
    0,
    &portInfo,
    sizeof(portInfo),
    &bytesReturned,
    NULL
);
```

#### IOCTL_HVSERIAL_SET_PORT_CONFIG
Configura parâmetros da porta serial.

```c
SERIAL_PORT_CONFIG config;
config.BaudRate = 115200;
config.DataBits = 8;
config.Parity = 0;      // Sem paridade
config.StopBits = 0;    // 1 bit de parada
config.FlowControl = 0; // Sem controle de fluxo

DeviceIoControl(
    hDevice,
    IOCTL_HVSERIAL_SET_PORT_CONFIG,
    &config,
    sizeof(config),
    NULL,
    0,
    &bytesReturned,
    NULL
);
```

#### IOCTL_HVSERIAL_BIND_PHYSICAL_PORT
Vincula a porta virtual a uma porta física (COM1, COM2, etc).

```c
ULONG portNumber = 1; // COM1

DeviceIoControl(
    hDevice,
    IOCTL_HVSERIAL_BIND_PHYSICAL_PORT,
    &portNumber,
    sizeof(portNumber),
    NULL,
    0,
    &bytesReturned,
    NULL
);
```

#### IOCTL_HVSERIAL_GET_STATISTICS
Obtém estatísticas de uso da porta.

```c
SERIAL_PORT_STATISTICS stats;

DeviceIoControl(
    hDevice,
    IOCTL_HVSERIAL_GET_STATISTICS,
    NULL,
    0,
    &stats,
    sizeof(stats),
    &bytesReturned,
    NULL
);

printf("Bytes transmitidos: %lld\n", stats.BytesTransmitted);
printf("Bytes recebidos: %lld\n", stats.BytesReceived);
```

### Leitura e Escrita de Dados

```c
// Abrir porta
HANDLE hPort = CreateFile(
    "\\\\.\\VCOM1",
    GENERIC_READ | GENERIC_WRITE,
    0,
    NULL,
    OPEN_EXISTING,
    FILE_ATTRIBUTE_NORMAL,
    NULL
);

// Escrever dados
char txData[] = "Hello, Serial Port!";
DWORD bytesWritten;
WriteFile(hPort, txData, strlen(txData), &bytesWritten, NULL);

// Ler dados
char rxData[256];
DWORD bytesRead;
ReadFile(hPort, rxData, sizeof(rxData), &bytesRead, NULL);

// Fechar porta
CloseHandle(hPort);
```

## Configuração no Hyper-V

### Para Windows Server / Hyper-V Host

1. Abra o **Gerenciador Hyper-V**

2. Selecione a VM desejada

3. Settings → Hardware → Add Hardware

4. Selecione **COM Port (Serial Port)**

5. Configure:
   - Named Pipe: `\\.\pipe\vmserial`
   - ou
   - Physical COM port: `COM1` (vinculado ao driver virtual)

6. Apply → OK

### Para PowerShell

```powershell
# Adicionar porta serial à VM
Set-VMComPort -VMName "MinhaVM" -Number 1 -Path "\\.\pipe\vmserial"

# Verificar configuração
Get-VMComPort -VMName "MinhaVM"
```

## Testes

### Teste Básico de Funcionamento

1. **Verificar carregamento do driver:**
   ```cmd
   sc query hvserial
   ```

2. **Teste de loopback:**
   - Conecte TX a RX na porta física
   - Execute aplicação de teste serial
   - Verifique se dados enviados são recebidos

3. **Verificar estatísticas:**
   - Use aplicação com IOCTL_HVSERIAL_GET_STATISTICS
   - Confirme contagem de bytes transmitidos/recebidos

### Ferramentas de Teste Recomendadas

- **PuTTY** - Terminal serial
- **RealTerm** - Monitor/teste de porta serial
- **Serial Port Monitor** - Captura de tráfego serial
- **PortMon** (Sysinternals) - Monitoramento de I/O de porta

## Solução de Problemas

### Driver não carrega

**Problema:** Driver falha ao inicializar

**Soluções:**
1. Verifique se o modo de teste está habilitado:
   ```cmd
   bcdedit /enum {current}
   ```
   Deve mostrar `testsigning Yes`

2. Verifique logs do sistema:
   - Event Viewer → Windows Logs → System
   - Procure por eventos do driver "HvSerial"

3. Use DebugView (Sysinternals) para ver mensagens KdPrint

### Porta não aparece no Gerenciador de Dispositivos

**Soluções:**
1. Reinstale o driver usando `pnputil -d` e depois `pnputil -a`
2. Execute `devmgmt.msc` → Action → Scan for hardware changes
3. Verifique se o arquivo .sys está em System32\drivers

### Erro STATUS_BUFFER_OVERFLOW

**Problema:** Buffer cheio ao transmitir dados

**Soluções:**
1. Aumente HVSERIAL_BUFFER_SIZE no header (padrão: 4096)
2. Implemente controle de fluxo
3. Processe dados mais rapidamente no lado receptor

### VM não consegue acessar porta

**Problema:** Máquina virtual não vê a porta serial

**Soluções:**
1. Verifique configuração da VM no Hyper-V
2. Confirme que a porta está vinculada (IOCTL_HVSERIAL_BIND_PHYSICAL_PORT)
3. Reinicie a VM após configurar a porta serial

## Limitações Conhecidas

1. **VMBus Integration:** 
   - Implementação básica de VMBus não incluída
   - Requer desenvolvimento adicional para integração completa

2. **Controle de Fluxo Hardware:**
   - Sinais RTS/CTS/DTR/DSR mapeados mas não totalmente implementados
   - Requer acesso direto ao hardware serial

3. **Múltiplas VMs:**
   - Uma porta física pode ser vinculada a apenas uma porta virtual por vez
   - Compartilhamento requer lógica de multiplexação adicional

4. **Performance:**
   - Buffer de 4KB pode limitar throughput em altas velocidades
   - Considere aumentar para aplicações de alta taxa de dados

## Debugging

### Habilitar Mensagens de Debug

O driver usa `KdPrint()` para mensagens de debug. Para visualizá-las:

1. **DebugView (Sysinternals):**
   - Execute como Administrador
   - Capture → Capture Kernel
   - Filtre por "HvSerial"

2. **WinDbg (Kernel Debugging):**
   ```
   kd> ed nt!Kd_DEFAULT_Mask 0xFFFFFFFF
   ```

### Símbolos de Debug

Para debugging com WinDbg:

1. Compile em modo Debug (não Release)
2. Copie o arquivo .pdb junto com o .sys
3. Configure símbolo path no WinDbg:
   ```
   .sympath+ C:\caminho\para\symbols
   ```

## Segurança

### Considerações

- ⚠️ Driver em modo kernel tem acesso completo ao sistema
- ⚠️ Validação de entrada é crítica para prevenir crashes
- ⚠️ Usar apenas em ambiente de desenvolvimento/teste sem assinatura
- ⚠️ Para produção, obter certificado de assinatura de código

### Assinatura do Driver (Produção)

Para usar em produção:

1. Obter certificado EV (Extended Validation) da Microsoft
2. Assinar o driver:
   ```cmd
   signtool sign /v /s "My" /n "Nome do Certificado" /t http://timestamp.digicert.com hvserial.sys
   ```
3. Criar catálogo:
   ```cmd
   inf2cat /driver:. /os:10_X64
   ```
4. Assinar catálogo:
   ```cmd
   signtool sign /v /s "My" /n "Nome do Certificado" /t http://timestamp.digicert.com hvserial.cat
   ```

## Licença

Copyright (c) 2024 Five Projects

Este software é fornecido "como está", sem garantias de qualquer tipo.

## Suporte

Para questões, problemas ou sugestões:

- **Discord:** https://discord.gg/329SeQp2dW
- **GitHub Issues:** https://github.com/fereirarereresas-debug/fiveprojects/issues

## Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o repositório
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## Changelog

### Versão 1.0.0 (Novembro 2024)
- ✅ Implementação inicial do driver
- ✅ Suporte a operações básicas de leitura/escrita
- ✅ IOCTLs personalizados para configuração
- ✅ Gerenciamento de buffers circulares
- ✅ Estatísticas de transmissão/recepção
- ✅ Arquivo INF para instalação

## Referências

- [Windows Driver Kit Documentation](https://docs.microsoft.com/windows-hardware/drivers/)
- [KMDF Programming Guide](https://docs.microsoft.com/windows-hardware/drivers/wdf/)
- [Serial Driver Design Guide](https://docs.microsoft.com/windows-hardware/drivers/serports/)
- [Hyper-V Architecture](https://docs.microsoft.com/virtualization/hyper-v-on-windows/)

## Autores

Desenvolvido pela equipe Five Projects para virtualização de portas seriais em ambientes Hyper-V.

---

**Nota:** Este é um driver de demonstração para fins educacionais e de desenvolvimento. Para uso em produção, são necessários testes extensivos, assinatura de código e validação de segurança completa.
