/*
 * hvserial_driver.h
 * 
 * Driver de Virtualização de Porta Serial para Hyper-V
 * 
 * Este arquivo contém as definições de estruturas, constantes e protótipos
 * de funções para o driver de virtualização de porta serial.
 * 
 * Copyright (c) 2024 Five Projects
 */

#ifndef _HVSERIAL_DRIVER_H_
#define _HVSERIAL_DRIVER_H_

#include <ntddk.h>
#include <wdf.h>
#include <initguid.h>

//
// Definições de constantes
//
#define HVSERIAL_POOL_TAG 'reSV'  // Tag para alocação de memória
#define HVSERIAL_MAX_PORTS 256    // Número máximo de portas seriais
#define HVSERIAL_BUFFER_SIZE 4096 // Tamanho do buffer de dados

//
// Versão do driver
//
#define HVSERIAL_MAJOR_VERSION 1
#define HVSERIAL_MINOR_VERSION 0
#define HVSERIAL_BUILD_NUMBER  0

//
// Códigos de controle IOCTL personalizados
//
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

//
// Estrutura de configuração de porta serial
//
typedef struct _SERIAL_PORT_CONFIG {
    ULONG BaudRate;          // Taxa de transmissão (bps)
    UCHAR DataBits;          // Bits de dados (5, 6, 7, 8)
    UCHAR Parity;            // Paridade (0=None, 1=Odd, 2=Even, 3=Mark, 4=Space)
    UCHAR StopBits;          // Bits de parada (0=1, 1=1.5, 2=2)
    UCHAR FlowControl;       // Controle de fluxo (0=None, 1=Hardware, 2=Software)
} SERIAL_PORT_CONFIG, *PSERIAL_PORT_CONFIG;

//
// Estrutura de estatísticas da porta
//
typedef struct _SERIAL_PORT_STATISTICS {
    ULONGLONG BytesTransmitted;  // Total de bytes transmitidos
    ULONGLONG BytesReceived;     // Total de bytes recebidos
    ULONGLONG FramingErrors;     // Erros de enquadramento
    ULONGLONG ParityErrors;      // Erros de paridade
    ULONGLONG OverrunErrors;     // Erros de sobrecarga
    ULONGLONG BufferOverruns;    // Sobrecarga de buffer
} SERIAL_PORT_STATISTICS, *PSERIAL_PORT_STATISTICS;

//
// Estrutura de informações da porta
//
typedef struct _SERIAL_PORT_INFO {
    ULONG PortNumber;               // Número da porta COM
    WCHAR PortName[64];             // Nome da porta (ex: COM1)
    BOOLEAN IsBound;                // Se está vinculada a uma porta física
    BOOLEAN IsVirtual;              // Se é uma porta virtual
    SERIAL_PORT_CONFIG Config;      // Configuração atual
    SERIAL_PORT_STATISTICS Stats;   // Estatísticas
} SERIAL_PORT_INFO, *PSERIAL_PORT_INFO;

//
// Estrutura de buffer circular para dados seriais
//
typedef struct _SERIAL_BUFFER {
    PUCHAR Buffer;           // Buffer de dados
    ULONG Size;              // Tamanho do buffer
    ULONG ReadIndex;         // Índice de leitura
    ULONG WriteIndex;        // Índice de escrita
    ULONG BytesAvailable;    // Bytes disponíveis para leitura
    KSPIN_LOCK Lock;         // Spinlock para sincronização
} SERIAL_BUFFER, *PSERIAL_BUFFER;

//
// Estrutura de contexto de dispositivo
//
typedef struct _DEVICE_CONTEXT {
    WDFDEVICE Device;                      // Objeto WDF do dispositivo
    WDFQUEUE DefaultQueue;                 // Fila padrão de I/O
    ULONG PortNumber;                      // Número da porta
    SERIAL_PORT_CONFIG Config;             // Configuração atual
    SERIAL_PORT_STATISTICS Statistics;     // Estatísticas
    SERIAL_BUFFER ReceiveBuffer;           // Buffer de recepção
    SERIAL_BUFFER TransmitBuffer;          // Buffer de transmissão
    BOOLEAN IsBound;                       // Se está vinculada
    PDEVICE_OBJECT PhysicalPort;           // Ponteiro para porta física
    KEVENT ReadEvent;                      // Evento para leitura
    KEVENT WriteEvent;                     // Evento para escrita
    KSPIN_LOCK DeviceLock;                 // Spinlock do dispositivo
} DEVICE_CONTEXT, *PDEVICE_CONTEXT;

WDF_DECLARE_CONTEXT_TYPE_WITH_NAME(DEVICE_CONTEXT, GetDeviceContext)

//
// Protótipos de funções (hvserial_driver.c)
//
DRIVER_INITIALIZE DriverEntry;

EVT_WDF_DRIVER_DEVICE_ADD HvSerialEvtDeviceAdd;
EVT_WDF_OBJECT_CONTEXT_CLEANUP HvSerialEvtDriverContextCleanup;

NTSTATUS
HvSerialCreateDevice(
    _Inout_ PWDFDEVICE_INIT DeviceInit
);

//
// Protótipos de funções (hvserial_ioctl.c)
//
EVT_WDF_IO_QUEUE_IO_DEVICE_CONTROL HvSerialEvtIoDeviceControl;

NTSTATUS
HvSerialGetPortInfo(
    _In_ WDFREQUEST Request,
    _In_ PDEVICE_CONTEXT DeviceContext
);

NTSTATUS
HvSerialSetPortConfig(
    _In_ WDFREQUEST Request,
    _In_ PDEVICE_CONTEXT DeviceContext
);

NTSTATUS
HvSerialBindPhysicalPort(
    _In_ WDFREQUEST Request,
    _In_ PDEVICE_CONTEXT DeviceContext
);

NTSTATUS
HvSerialUnbindPhysicalPort(
    _In_ PDEVICE_CONTEXT DeviceContext
);

NTSTATUS
HvSerialGetStatistics(
    _In_ WDFREQUEST Request,
    _In_ PDEVICE_CONTEXT DeviceContext
);

//
// Protótipos de funções (hvserial_port.c)
//
EVT_WDF_IO_QUEUE_IO_READ HvSerialEvtIoRead;
EVT_WDF_IO_QUEUE_IO_WRITE HvSerialEvtIoWrite;

NTSTATUS
HvSerialInitializeBuffer(
    _Out_ PSERIAL_BUFFER Buffer,
    _In_ ULONG Size
);

VOID
HvSerialCleanupBuffer(
    _In_ PSERIAL_BUFFER Buffer
);

NTSTATUS
HvSerialWriteBuffer(
    _In_ PSERIAL_BUFFER Buffer,
    _In_ PUCHAR Data,
    _In_ ULONG Length,
    _Out_ PULONG BytesWritten
);

NTSTATUS
HvSerialReadBuffer(
    _In_ PSERIAL_BUFFER Buffer,
    _Out_ PUCHAR Data,
    _In_ ULONG Length,
    _Out_ PULONG BytesRead
);

NTSTATUS
HvSerialTransmitData(
    _In_ PDEVICE_CONTEXT DeviceContext,
    _In_ PUCHAR Data,
    _In_ ULONG Length
);

NTSTATUS
HvSerialReceiveData(
    _In_ PDEVICE_CONTEXT DeviceContext,
    _Out_ PUCHAR Data,
    _In_ ULONG Length,
    _Out_ PULONG BytesReceived
);

//
// Funções auxiliares inline
//
__forceinline
ULONG
HvSerialGetBufferSpace(
    _In_ PSERIAL_BUFFER Buffer
)
{
    return Buffer->Size - Buffer->BytesAvailable;
}

__forceinline
BOOLEAN
HvSerialIsBufferEmpty(
    _In_ PSERIAL_BUFFER Buffer
)
{
    return (Buffer->BytesAvailable == 0);
}

__forceinline
BOOLEAN
HvSerialIsBufferFull(
    _In_ PSERIAL_BUFFER Buffer
)
{
    return (Buffer->BytesAvailable >= Buffer->Size);
}

#endif // _HVSERIAL_DRIVER_H_
