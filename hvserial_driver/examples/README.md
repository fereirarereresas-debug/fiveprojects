# Exemplos de Uso do Driver Hyper-V Serial Port

Este diretório contém aplicações de exemplo que demonstram como usar o driver de porta serial virtual Hyper-V.

## test_hvserial.c

Aplicação de teste completa que demonstra todas as funcionalidades do driver.

### Funcionalidades Demonstradas

1. **Abertura do dispositivo** - Como abrir a porta virtual
2. **Obtenção de informações** - Usar IOCTL_HVSERIAL_GET_PORT_INFO
3. **Configuração da porta** - Usar IOCTL_HVSERIAL_SET_PORT_CONFIG
4. **Vinculação a porta física** - Usar IOCTL_HVSERIAL_BIND_PHYSICAL_PORT
5. **Escrita de dados** - Usar WriteFile
6. **Leitura de dados** - Usar ReadFile
7. **Obtenção de estatísticas** - Usar IOCTL_HVSERIAL_GET_STATISTICS
8. **Desvinculação da porta** - Usar IOCTL_HVSERIAL_UNBIND_PHYSICAL_PORT

### Compilação

#### Com Visual Studio:
```cmd
cl test_hvserial.c
```

#### Com MinGW/GCC:
```cmd
gcc test_hvserial.c -o test_hvserial.exe
```

### Uso

Execute o programa sem argumentos para usar COM1:
```cmd
test_hvserial.exe
```

Ou especifique o número da porta física (1 para COM1, 2 para COM2, etc):
```cmd
test_hvserial.exe 2
```

### Saída Esperada

```
==============================================
  Teste do Driver de Porta Serial Hyper-V
  Five Projects - 2024
==============================================

Abrindo dispositivo...
Dispositivo aberto com sucesso!

1. Obtendo informações da porta...

=== Informações da Porta ===
Nome: VCOM1
Número: 0
Virtual: Sim
Vinculada: Não

Configuração:
  Baud Rate: 9600 bps
  Data Bits: 8
  Parity: 0
  Stop Bits: 0
  Flow Control: 0

2. Configurando porta serial...
Configuração aplicada:
  Baud Rate: 115200 bps
  Data Bits: 8
  Parity: None
  Stop Bits: 1
  Flow Control: None

3. Vinculando à porta física COM1...
Porta vinculada com sucesso!

4. Testando escrita de dados...
Escritos 52 bytes: Hello from Hyper-V Serial Driver! Port: COM1

5. Testando leitura de dados...
Nenhum dado recebido (normal se não houver loopback)

6. Obtendo estatísticas...

=== Estatísticas da Porta ===
Bytes Transmitidos: 52
Bytes Recebidos: 0
Erros de Enquadramento: 0
Erros de Paridade: 0
Erros de Sobrecarga: 0
Sobrecarga de Buffer: 0

7. Desvinculando porta física...
Porta desvinculada com sucesso!

==============================================
Teste concluído!
==============================================
```

### Notas

- O programa requer que o driver esteja instalado e funcionando
- Para ver dados recebidos, configure um loopback (conecte TX a RX na porta física)
- Execute como Administrador se encontrar problemas de permissão
- Use DebugView (Sysinternals) para ver mensagens do driver

## Outros Exemplos

Você pode criar suas próprias aplicações baseadas neste exemplo. Algumas ideias:

1. **Monitor de Porta Serial** - Aplicação que monitora e exibe todo o tráfego
2. **Terminal Serial** - Terminal interativo para comunicação serial
3. **Teste de Performance** - Medir throughput e latência
4. **Configurador de Porta** - GUI para configurar parâmetros da porta

## Referências

Para mais informações sobre as APIs do Windows usadas:

- [CreateFile](https://docs.microsoft.com/windows/win32/api/fileapi/nf-fileapi-createfilea)
- [ReadFile](https://docs.microsoft.com/windows/win32/api/fileapi/nf-fileapi-readfile)
- [WriteFile](https://docs.microsoft.com/windows/win32/api/fileapi/nf-fileapi-writefile)
- [DeviceIoControl](https://docs.microsoft.com/windows/win32/api/ioapiset/nf-ioapiset-deviceiocontrol)
