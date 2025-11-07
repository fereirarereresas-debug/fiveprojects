/*
 * test_hvserial.c
 * 
 * Aplicação de Teste para o Driver de Porta Serial Virtual Hyper-V
 * 
 * Esta aplicação demonstra como usar o driver para:
 * - Abrir uma porta serial virtual
 * - Configurar parâmetros da porta
 * - Vincular a uma porta física
 * - Enviar e receber dados
 * - Obter estatísticas
 * 
 * Compilação (Visual Studio ou MinGW):
 *   cl test_hvserial.c
 *   gcc test_hvserial.c -o test_hvserial.exe
 * 
 * Uso:
 *   test_hvserial.exe [número_da_porta_física]
 * 
 * Copyright (c) 2024 Five Projects
 */

#include <windows.h>
#include <stdio.h>
#include <stdlib.h>

// Definições dos IOCTLs (devem corresponder ao driver)
#define IOCTL_HVSERIAL_GET_PORT_INFO \
    CTL_CODE(FILE_DEVICE_SERIAL_PORT, 0x800, METHOD_BUFFERED, FILE_ANY_ACCESS)

#define IOCTL_HVSERIAL_SET_PORT_CONFIG \
    CTL_CODE(FILE_DEVICE_SERIAL_PORT, 0x801, METHOD_BUFFERED, FILE_ANY_ACCESS)

#define IOCTL_HVSERIAL_BIND_PHYSICAL_PORT \
    CTL_CODE(FILE_DEVICE_SERIAL_PORT, 0x802, METHOD_BUFFERED, FILE_ANY_ACCESS)

#define IOCTL_HVSERIAL_UNBIND_PHYSICAL_PORT \
    CTL_CODE(FILE_DEVICE_SERIAL_PORT, 0x803, METHOD_BUFFERED, FILE_ANY_ACCESS)

#define IOCTL_HVSERIAL_GET_STATISTICS \
    CTL_CODE(FILE_DEVICE_SERIAL_PORT, 0x804, METHOD_BUFFERED, FILE_ANY_ACCESS)

// Estruturas (devem corresponder ao driver)
typedef struct _SERIAL_PORT_CONFIG {
    ULONG BaudRate;
    UCHAR DataBits;
    UCHAR Parity;
    UCHAR StopBits;
    UCHAR FlowControl;
} SERIAL_PORT_CONFIG;

typedef struct _SERIAL_PORT_STATISTICS {
    ULONGLONG BytesTransmitted;
    ULONGLONG BytesReceived;
    ULONGLONG FramingErrors;
    ULONGLONG ParityErrors;
    ULONGLONG OverrunErrors;
    ULONGLONG BufferOverruns;
} SERIAL_PORT_STATISTICS;

typedef struct _SERIAL_PORT_INFO {
    ULONG PortNumber;
    WCHAR PortName[64];
    BOOLEAN IsBound;
    BOOLEAN IsVirtual;
    SERIAL_PORT_CONFIG Config;
    SERIAL_PORT_STATISTICS Stats;
} SERIAL_PORT_INFO;

/*
 * Exibe informações da porta
 */
void PrintPortInfo(SERIAL_PORT_INFO* info)
{
    printf("\n=== Informações da Porta ===\n");
    printf("Nome: %ls\n", info->PortName);
    printf("Número: %lu\n", info->PortNumber);
    printf("Virtual: %s\n", info->IsVirtual ? "Sim" : "Não");
    printf("Vinculada: %s\n", info->IsBound ? "Sim" : "Não");
    printf("\nConfiguração:\n");
    printf("  Baud Rate: %lu bps\n", info->Config.BaudRate);
    printf("  Data Bits: %u\n", info->Config.DataBits);
    printf("  Parity: %u\n", info->Config.Parity);
    printf("  Stop Bits: %u\n", info->Config.StopBits);
    printf("  Flow Control: %u\n", info->Config.FlowControl);
}

/*
 * Exibe estatísticas da porta
 */
void PrintStatistics(SERIAL_PORT_STATISTICS* stats)
{
    printf("\n=== Estatísticas da Porta ===\n");
    printf("Bytes Transmitidos: %llu\n", stats->BytesTransmitted);
    printf("Bytes Recebidos: %llu\n", stats->BytesReceived);
    printf("Erros de Enquadramento: %llu\n", stats->FramingErrors);
    printf("Erros de Paridade: %llu\n", stats->ParityErrors);
    printf("Erros de Sobrecarga: %llu\n", stats->OverrunErrors);
    printf("Sobrecarga de Buffer: %llu\n", stats->BufferOverruns);
}

/*
 * Função principal de teste
 */
int main(int argc, char* argv[])
{
    HANDLE hDevice;
    DWORD bytesReturned;
    BOOL success;
    SERIAL_PORT_INFO portInfo;
    SERIAL_PORT_CONFIG config;
    SERIAL_PORT_STATISTICS stats;
    ULONG physicalPort = 1; // COM1 por padrão
    char txBuffer[256];
    char rxBuffer[256];
    DWORD bytesWritten, bytesRead;

    printf("==============================================\n");
    printf("  Teste do Driver de Porta Serial Hyper-V\n");
    printf("  Five Projects - 2024\n");
    printf("==============================================\n\n");

    // Verificar argumentos
    if (argc > 1) {
        physicalPort = atoi(argv[1]);
        if (physicalPort < 1 || physicalPort > 256) {
            printf("ERRO: Número de porta inválido (1-256)\n");
            return 1;
        }
    }

    // Abrir dispositivo
    printf("Abrindo dispositivo...\n");
    hDevice = CreateFile(
        "\\\\.\\VCOM1",
        GENERIC_READ | GENERIC_WRITE,
        0,
        NULL,
        OPEN_EXISTING,
        FILE_ATTRIBUTE_NORMAL,
        NULL
    );

    if (hDevice == INVALID_HANDLE_VALUE) {
        printf("ERRO: Não foi possível abrir o dispositivo (Código: %lu)\n", GetLastError());
        printf("Certifique-se de que o driver está instalado.\n");
        return 1;
    }

    printf("Dispositivo aberto com sucesso!\n");

    // Obter informações da porta
    printf("\n1. Obtendo informações da porta...\n");
    success = DeviceIoControl(
        hDevice,
        IOCTL_HVSERIAL_GET_PORT_INFO,
        NULL,
        0,
        &portInfo,
        sizeof(portInfo),
        &bytesReturned,
        NULL
    );

    if (success) {
        PrintPortInfo(&portInfo);
    } else {
        printf("ERRO: Falha ao obter informações da porta (Código: %lu)\n", GetLastError());
    }

    // Configurar porta serial
    printf("\n2. Configurando porta serial...\n");
    config.BaudRate = 115200;
    config.DataBits = 8;
    config.Parity = 0;      // Sem paridade
    config.StopBits = 0;    // 1 bit de parada
    config.FlowControl = 0; // Sem controle de fluxo

    success = DeviceIoControl(
        hDevice,
        IOCTL_HVSERIAL_SET_PORT_CONFIG,
        &config,
        sizeof(config),
        NULL,
        0,
        &bytesReturned,
        NULL
    );

    if (success) {
        printf("Configuração aplicada:\n");
        printf("  Baud Rate: %lu bps\n", config.BaudRate);
        printf("  Data Bits: %u\n", config.DataBits);
        printf("  Parity: None\n");
        printf("  Stop Bits: 1\n");
        printf("  Flow Control: None\n");
    } else {
        printf("ERRO: Falha ao configurar porta (Código: %lu)\n", GetLastError());
    }

    // Vincular à porta física
    printf("\n3. Vinculando à porta física COM%lu...\n", physicalPort);
    success = DeviceIoControl(
        hDevice,
        IOCTL_HVSERIAL_BIND_PHYSICAL_PORT,
        &physicalPort,
        sizeof(physicalPort),
        NULL,
        0,
        &bytesReturned,
        NULL
    );

    if (success) {
        printf("Porta vinculada com sucesso!\n");
    } else {
        printf("AVISO: Falha ao vincular porta física (Código: %lu)\n", GetLastError());
        printf("Continuando em modo virtual...\n");
    }

    // Teste de escrita
    printf("\n4. Testando escrita de dados...\n");
    sprintf(txBuffer, "Hello from Hyper-V Serial Driver! Port: COM%lu\r\n", physicalPort);
    
    success = WriteFile(
        hDevice,
        txBuffer,
        (DWORD)strlen(txBuffer),
        &bytesWritten,
        NULL
    );

    if (success) {
        printf("Escritos %lu bytes: %s", bytesWritten, txBuffer);
    } else {
        printf("ERRO: Falha ao escrever dados (Código: %lu)\n", GetLastError());
    }

    // Teste de leitura (pode não retornar dados se não houver loopback)
    printf("\n5. Testando leitura de dados...\n");
    success = ReadFile(
        hDevice,
        rxBuffer,
        sizeof(rxBuffer) - 1,
        &bytesRead,
        NULL
    );

    if (success && bytesRead > 0) {
        rxBuffer[bytesRead] = '\0';
        printf("Lidos %lu bytes: %s\n", bytesRead, rxBuffer);
    } else {
        printf("Nenhum dado recebido (normal se não houver loopback)\n");
    }

    // Obter estatísticas
    printf("\n6. Obtendo estatísticas...\n");
    success = DeviceIoControl(
        hDevice,
        IOCTL_HVSERIAL_GET_STATISTICS,
        NULL,
        0,
        &stats,
        sizeof(stats),
        &bytesReturned,
        NULL
    );

    if (success) {
        PrintStatistics(&stats);
    } else {
        printf("ERRO: Falha ao obter estatísticas (Código: %lu)\n", GetLastError());
    }

    // Desvincular porta física
    printf("\n7. Desvinculando porta física...\n");
    success = DeviceIoControl(
        hDevice,
        IOCTL_HVSERIAL_UNBIND_PHYSICAL_PORT,
        NULL,
        0,
        NULL,
        0,
        &bytesReturned,
        NULL
    );

    if (success) {
        printf("Porta desvinculada com sucesso!\n");
    } else {
        printf("AVISO: Falha ao desvincular porta (Código: %lu)\n", GetLastError());
    }

    // Fechar dispositivo
    CloseHandle(hDevice);
    printf("\n==============================================\n");
    printf("Teste concluído!\n");
    printf("==============================================\n");

    return 0;
}
